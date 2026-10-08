# ---------------------------------------------------------------------------
# Variables de entrada. Todo dato que puede cambiar entre entornos o que
# representa estado (nombres, tamaños, CIDR, credenciales) vive aquí, con
# defaults razonables para el laboratorio.
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "Región de AWS donde se despliega la infraestructura."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Etiqueta de entorno aplicada vía default_tags."
  type        = string
  default     = "lab"
}

variable "admin_cidr" {
  description = "CIDR permitido para SSH y puertos de aplicación de los EC2. Práctica de laboratorio con 0.0.0.0/0; endurecer (p. ej. <ip-publica>/32) antes de cualquier uso real."
  type        = string
  default     = "0.0.0.0/0"
}

variable "db_username" {
  description = "Usuario administrador de RDS MySQL."
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Contraseña del usuario maestro de RDS MySQL. Sin default a propósito: inyectarla con TF_VAR_db_password o en terraform.tfvars (gitignoreado). Ver terraform.tfvars.example."
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Nombre de la base de datos creada al aprovisionar RDS."
  type        = string
  default     = "pasteleria_my_dreams"
}

variable "db_engine_version" {
  description = "Versión de MySQL en RDS."
  type        = string
  default     = "8.0"
}

variable "db_instance_class" {
  description = "Clase de instancia RDS (la más económica del laboratorio)."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Almacenamiento de RDS en GiB."
  type        = number
  default     = 20
}

variable "instance_type" {
  description = "Tipo de instancia EC2 para los cuatro microservicios y el broker Kafka."
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Nombre del par de claves SSH creado en AWS para el acceso por SSH."
  type        = string
  default     = "pasteleria-my-dreams"
}

variable "web_bucket_name" {
  description = "Nombre del bucket S3 del sitio estático del frontend. Los nombres S3 son únicos globalmente: si el default ya está en uso, cambiarlo por uno distinto."
  type        = string
  default     = "pasteleria-my-dreams-web-8digital"
}

variable "apigw_stage" {
  description = "Nombre del stage de la API Gateway; forma parte de la URL de invocación https://<api-id>.execute-api.<region>.amazonaws.com/<stage>. Debe calzar con VITE_API_BASE_URL del frontend."
  type        = string
  default     = "v2"
}
