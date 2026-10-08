# ---------------------------------------------------------------------------
# Kafka self-hosted (incremento v2): broker único en modo KRaft sobre una EC2
# t3.micro (sin MSK, que no entra en el presupuesto del lab).
#
# El user_data es BEST-EFFORT: descarga el binario oficial de Kafka 3.9.0
# (misma versión que el docker-compose local de pedidos-service), formatea el
# almacenamiento KRaft y arranca el broker. El arranque queda verificado
# (readiness) y supervisado por systemd; ante un fallo en el laboratorio,
# diagnosticar con `systemctl status pasteleria-kafka` y el log
# /var/log/pasteleria-kafka-userdata.log de la instancia.
#
# Alternativa documentada en el README de pedidos-service: instalar Docker en
# esta misma EC2 y levantar su docker-compose.yml.
# ---------------------------------------------------------------------------

locals {
  user_data_kafka = <<-EOT
    #!/bin/bash
    exec > /var/log/pasteleria-kafka-userdata.log 2>&1
    set -x

    dnf install -y java-21-amazon-corretto-headless tar gzip

    KAFKA_VERSION=3.9.0
    cd /opt
    curl -fL -o kafka.tgz "https://dlcdn.apache.org/kafka/$KAFKA_VERSION/kafka_2.13-$KAFKA_VERSION.tgz" || \
      curl -fL -o kafka.tgz "https://archive.apache.org/dist/kafka/$KAFKA_VERSION/kafka_2.13-$KAFKA_VERSION.tgz"
    tar -xzf kafka.tgz
    ln -sfn "/opt/kafka_2.13-$KAFKA_VERSION" /opt/kafka

    # El broker debe anunciar un hostname alcanzable desde las otras EC2.
    # El reemplazo es determinístico: se elimina cualquier línea previa de
    # advertised.listeners y se agrega la correcta al final del archivo; si la
    # verificación posterior falla, el user_data termina con error.
    TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
    # Carrera con la EIP: la asociación de la IP elástica ocurre en los
    # primeros segundos y reemplaza la IP efímera. Si se captura el
    # public-hostname antes de esa asociación, el broker anunciaría una IP
    # que ya no existe y ningún otro servicio podría conectarse. Se muestrea
    # hasta 24 veces con 5 s entre rondas y se considera estable cuando hay 3
    # muestras consecutivas iguales y no vacías (2 coincidencias seguidas tras
    # la primera). Si el bucle termina sin confirmar, se usa el último valor.
    LAST_HOST=""
    STABLE_COUNT=0
    STABLE_HOST=""
    for i in $(seq 1 24); do
      HOST=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-hostname)
      if [ -n "$HOST" ] && [ "$HOST" = "$LAST_HOST" ]; then
        STABLE_COUNT=$((STABLE_COUNT + 1))
      else
        STABLE_COUNT=0
      fi
      LAST_HOST="$HOST"
      if [ "$STABLE_COUNT" -ge 2 ]; then
        STABLE_HOST="$HOST"
        echo "public-hostname estable tras $i muestras: $HOST"
        break
      fi
      sleep 5
    done
    if [ -z "$STABLE_HOST" ]; then
      STABLE_HOST="$LAST_HOST"
      echo "AVISO: public-hostname no confirmado como estable; se usa el ultimo valor: $STABLE_HOST" >&2
    fi
    PUBLIC_DNS="$STABLE_HOST"
    CONF=/opt/kafka/config/kraft/server.properties
    sed -i '/^advertised.listeners=/d' "$CONF"
    echo "advertised.listeners=PLAINTEXT://$PUBLIC_DNS:9092" >> "$CONF"
    echo "auto.create.topics.enable=true" >> "$CONF"
    if ! grep -q "^advertised.listeners=PLAINTEXT://$PUBLIC_DNS:9092$" "$CONF"; then
      echo "ERROR: advertised.listeners no quedo configurado" >&2
      exit 1
    fi

    CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)
    /opt/kafka/bin/kafka-storage.sh format -t "$CLUSTER_ID" -c /opt/kafka/config/kraft/server.properties
    # El broker se supervisa con systemd: unidad dedicada escrita con echo
    # (sin heredoc anidado) y verificación explícita de readiness al arrancar.
    echo "[Unit]" > /etc/systemd/system/pasteleria-kafka.service
    echo "Description=Apache Kafka (KRaft) - Pasteleria My Dreams" >> /etc/systemd/system/pasteleria-kafka.service
    echo "After=network-online.target" >> /etc/systemd/system/pasteleria-kafka.service
    echo "Wants=network-online.target" >> /etc/systemd/system/pasteleria-kafka.service
    echo "" >> /etc/systemd/system/pasteleria-kafka.service
    echo "[Service]" >> /etc/systemd/system/pasteleria-kafka.service
    echo "Type=simple" >> /etc/systemd/system/pasteleria-kafka.service
    echo "ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties" >> /etc/systemd/system/pasteleria-kafka.service
    echo "Restart=on-failure" >> /etc/systemd/system/pasteleria-kafka.service
    echo "RestartSec=10" >> /etc/systemd/system/pasteleria-kafka.service
    echo "LimitNOFILE=1000000" >> /etc/systemd/system/pasteleria-kafka.service
    echo "" >> /etc/systemd/system/pasteleria-kafka.service
    echo "[Install]" >> /etc/systemd/system/pasteleria-kafka.service
    echo "WantedBy=multi-user.target" >> /etc/systemd/system/pasteleria-kafka.service
    systemctl daemon-reload
    systemctl enable --now pasteleria-kafka

    # Readiness: hasta 30 intentos con 10 s de espera entre ellos.
    for i in $(seq 1 30); do
      if timeout 30 /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1; then
        echo "Kafka broker listo y verificado en el intento $i"
        exit 0
      fi
      sleep 10
    done
    echo "ERROR: el broker Kafka no respondio tras 30 intentos" >&2
    systemctl status pasteleria-kafka --no-pager >&2 || true
    exit 1
  EOT
}

resource "aws_instance" "kafka" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = local.subnet_id
  vpc_security_group_ids      = [aws_security_group.kafka.id]
  key_name                    = aws_key_pair.lab.key_name
  user_data                   = local.user_data_kafka
  associate_public_ip_address = true

  tags = {
    Name    = "pasteleria-kafka"
    Service = "kafka"
    Port    = "9092"
  }
}
