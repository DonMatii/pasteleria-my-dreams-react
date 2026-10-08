# ---------------------------------------------------------------------------
# Red: se reutiliza la VPC por defecto del laboratorio (no se crea VPC propia,
# criterio de aceptación de la tarea).
# ---------------------------------------------------------------------------

data "aws_vpc" "default" {
  default = true
}

# Subredes de la VPC por defecto (una por AZ, todas públicas con
# MapPublicIpOnLaunch en la VPC default).
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  # Se ordenan los ids para elegir la subred de forma determinística.
  subnet_id = sort(data.aws_subnets.default.ids)[0]
}

# ---------------------------------------------------------------------------
# Security groups
# ---------------------------------------------------------------------------

# SG de los microservicios (4 EC2 de Spring Boot).
# Nota: el tráfico de API Gateway hacia los EC2 llega desde los rangos IP del
# servicio; en el lab se abre con admin_cidr (0.0.0.0/0 por defecto) y se
# endurece después.
resource "aws_security_group" "web" {
  name        = "pasteleria-web"
  description = "Microservicios Spring Boot: SSH y puertos 8080-8083"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH de administracion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  ingress {
    description = "Puertos de los servicios: 8080 catalogo, 8081 estadisticas, 8082 pedidos, 8083 notificaciones"
    from_port   = 8080
    to_port     = 8083
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    description = "Salida libre (descargas de paquetes y llamadas a otros servicios)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# SG de RDS MySQL: 3306 solo desde los microservicios y desde la red de
# administración (abierto en el lab por la práctica de credenciales públicas).
resource "aws_security_group" "db" {
  name        = "pasteleria-db"
  description = "RDS MySQL: 3306 desde los microservicios y admin_cidr"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "MySQL desde los microservicios (SG web)"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  ingress {
    description = "MySQL desde la red de administracion (practica de lab)"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    description = "Salida libre"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# SG del broker Kafka autoalojado: 9092 desde los microservicios (productores
# y consumidores) y desde admin_cidr para pruebas. KRaft no usa ZooKeeper, por
# eso el 2181 no se expone.
resource "aws_security_group" "kafka" {
  name        = "pasteleria-kafka"
  description = "Broker Kafka KRaft: 9092 y SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Kafka desde los microservicios (SG web)"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  ingress {
    description = "Kafka desde la red de administracion (pruebas del lab)"
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  ingress {
    description = "SSH de administracion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    description = "Salida libre (descarga del binario de Kafka)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
