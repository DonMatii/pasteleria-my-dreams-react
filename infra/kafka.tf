# ---------------------------------------------------------------------------
# Kafka self-hosted (incremento v2): broker único en modo KRaft sobre una EC2
# t3.micro (sin MSK, que no entra en el presupuesto del lab).
#
# El user_data es BEST-EFFORT: descarga el binario oficial de Kafka 3.9.0
# (misma versión que el docker-compose local de pedidos-service), formatea el
# almacenamiento KRaft y arranca el broker. Se verifica recién cuando el
# laboratorio lo ejecuta; si falla, revisar /var/log/pasteleria-kafka-userdata.log
# y /var/log/kafka-broker.log en la instancia.
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
    # Si el sed no encuentra la línea, el broker anuncia su DNS privado, que
    # también es alcanzable desde la misma VPC.
    TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
    PUBLIC_DNS=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-hostname)
    sed -i "s|advertised.listeners=PLAINTEXT://localhost:9092|advertised.listeners=PLAINTEXT://$PUBLIC_DNS:9092|" /opt/kafka/config/kraft/server.properties
    echo "auto.create.topics.enable=true" >> /opt/kafka/config/kraft/server.properties

    CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)
    /opt/kafka/bin/kafka-storage.sh format -t "$CLUSTER_ID" -c /opt/kafka/config/kraft/server.properties
    nohup /opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties > /var/log/kafka-broker.log 2>&1 &
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
