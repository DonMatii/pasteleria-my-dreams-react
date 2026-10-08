# ---------------------------------------------------------------------------
# Compute: 4 EC2 t3.micro con Amazon Linux 2023 (una por microservicio) más
# el key pair. La AMI se resuelve desde un parámetro público de SSM, sin AMIs
# hardcodeadas.
# ---------------------------------------------------------------------------

data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# Par de claves: tls genera el par, aws_key_pair registra la clave pública en
# AWS y local_file escribe la clave privada en infra/pasteleria-key.pem
# (gitignoreada) para poder entrar por SSH.
resource "tls_private_key" "lab" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "lab" {
  key_name   = var.key_name
  public_key = tls_private_key.lab.public_key_openssh
}

resource "local_file" "clave_privada" {
  filename        = "${path.module}/pasteleria-key.pem"
  content         = tls_private_key.lab.private_key_pem
  file_permission = "0600"
}

# user_data mínimo compartido: instala Java 21 (Corretto) para los jar de
# Spring Boot. Las variables de entorno de cada servicio (DB_URL, DB_USER,
# DB_PASS, spring.kafka.bootstrap-servers, app.kafka.topic, APP_ADMIN_API_KEY)
# se inyectan al desplegar el jar, según los README de cada repositorio.
locals {
  user_data_java = <<-EOT
    #!/bin/bash
    dnf install -y java-21-amazon-corretto-headless
  EOT
}

# Catálogo (v1 replicada) — puerto 8080, endpoints /api/productos.
# Env esperada: DB_URL / DB_USER / DB_PASS hacia RDS y APP_ADMIN_API_KEY
# (protege POST/PUT/DELETE con header X-Api-Key).
resource "aws_instance" "catalogo" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = local.subnet_id
  vpc_security_group_ids      = [aws_security_group.web.id]
  key_name                    = aws_key_pair.lab.key_name
  user_data                   = local.user_data_java
  associate_public_ip_address = true

  tags = {
    Name    = "pasteleria-catalogo"
    Service = "catalogo-service"
    Port    = "8080"
  }
}

# Estadísticas (v1 replicada) — puerto 8081, endpoint /api/estadisticas.
# Env esperada: DB_URL / DB_USER / DB_PASS, spring.kafka.bootstrap-servers
# (kafka:9092, incremento v2) y app.kafka.topic=pedidos.
resource "aws_instance" "estadisticas" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = local.subnet_id
  vpc_security_group_ids      = [aws_security_group.web.id]
  key_name                    = aws_key_pair.lab.key_name
  user_data                   = local.user_data_java
  associate_public_ip_address = true

  tags = {
    Name    = "pasteleria-estadisticas"
    Service = "estadisticas-service"
    Port    = "8081"
  }
}

# Pedidos (incremento v2) — puerto 8082, endpoints /api/pedidos.
# Env esperada: DB_URL / DB_USER / DB_PASS, spring.kafka.bootstrap-servers
# (productor del topic pedidos), app.kafka.topic y APP_ADMIN_API_KEY.
resource "aws_instance" "pedidos" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = local.subnet_id
  vpc_security_group_ids      = [aws_security_group.web.id]
  key_name                    = aws_key_pair.lab.key_name
  user_data                   = local.user_data_java
  associate_public_ip_address = true

  tags = {
    Name    = "pasteleria-pedidos"
    Service = "pedidos-service"
    Port    = "8082"
  }
}

# Notificaciones (incremento v2) — puerto 8083, endpoint /api/notificaciones.
# Env esperada: DB_URL / DB_USER / DB_PASS, spring.kafka.bootstrap-servers
# (consumidor del topic pedidos), app.kafka.topic y APP_ADMIN_API_KEY.
resource "aws_instance" "notificaciones" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = local.subnet_id
  vpc_security_group_ids      = [aws_security_group.web.id]
  key_name                    = aws_key_pair.lab.key_name
  user_data                   = local.user_data_java
  associate_public_ip_address = true

  tags = {
    Name    = "pasteleria-notificaciones"
    Service = "notificaciones-service"
    Port    = "8083"
  }
}

# ---------------------------------------------------------------------------
# IPs elásticas (EIP): una por instancia para que la IP pública sea ESTABLE
# entre reinicios del Learner Lab (la IP efímera que asigna el default VPC
# cambia en cada arranque de sesión). Cuota del lab: 5 EIP por región y aquí
# se usan exactamente 5 (4 servicios + Kafka), sin superarla.
#
# Costo: la EIP es gratis mientras está asociada a una instancia corriendo;
# cuesta ~$0.005/h si queda asociada a una instancia parada (así AWS evita
# que el IP se libere). Se acepta: entre sesiones del lab la instancia queda
# detenida y la IP se conserva.
# ---------------------------------------------------------------------------
locals {
  # Claves estables -> id de instancia. Las claves coinciden con las de
  # rutas_api/hosts_api en apigw.tf; kafka viene de kafka.tf (referencia
  # cruzada entre archivos, válida en Terraform).
  instancias_eip = {
    catalogo       = aws_instance.catalogo.id
    estadisticas   = aws_instance.estadisticas.id
    pedidos        = aws_instance.pedidos.id
    notificaciones = aws_instance.notificaciones.id
    kafka          = aws_instance.kafka.id
  }
}

resource "aws_eip" "servicio" {
  for_each = local.instancias_eip
  domain   = "vpc"

  tags = {
    Name = "pasteleria-eip-${each.key}"
  }
}

# La asociación es lo que hace que la IP estable reemplace a la efímera: la
# API Gateway y los READMEs deben apuntar siempre a la EIP (se lee desde
# aws_eip.servicio, nunca desde aws_instance.*.public_ip).
resource "aws_eip_association" "servicio" {
  for_each      = local.instancias_eip
  instance_id   = each.value
  allocation_id = aws_eip.servicio[each.key].allocation_id
}
