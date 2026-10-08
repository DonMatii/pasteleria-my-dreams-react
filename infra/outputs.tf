# ---------------------------------------------------------------------------
# Salidas: datos de contacto de lo desplegado (IPs, endpoints y URL del
# gateway) para configurar el frontend y los README de los servicios.
# ---------------------------------------------------------------------------

output "servidores" {
  description = "IP y DNS públicos de las instancias EC2 por servicio."
  value = {
    catalogo = {
      public_ip  = aws_instance.catalogo.public_ip
      public_dns = aws_instance.catalogo.public_dns
    }
    estadisticas = {
      public_ip  = aws_instance.estadisticas.public_ip
      public_dns = aws_instance.estadisticas.public_dns
    }
    pedidos = {
      public_ip  = aws_instance.pedidos.public_ip
      public_dns = aws_instance.pedidos.public_dns
    }
    notificaciones = {
      public_ip  = aws_instance.notificaciones.public_ip
      public_dns = aws_instance.notificaciones.public_dns
    }
    kafka = {
      public_ip  = aws_instance.kafka.public_ip
      public_dns = aws_instance.kafka.public_dns
    }
  }
}

output "kafka_broker" {
  description = "Bootstrap servers de Kafka para spring.kafka.bootstrap-servers."
  value       = "${aws_instance.kafka.public_dns}:9092"
}

output "rds_endpoint" {
  description = "Endpoint de conexión de RDS (host:puerto) para DB_URL."
  value       = aws_db_instance.pasteleria.endpoint
}

output "rds_db_name" {
  description = "Nombre de la base de datos creada en RDS."
  value       = aws_db_instance.pasteleria.db_name
}

output "website_endpoint" {
  description = "Endpoint web del sitio estático del frontend en S3."
  value       = aws_s3_bucket_website_configuration.web.website_endpoint
}

output "api_gateway_invoke_url" {
  description = "URL base de invocación de la API Gateway; debe calzar con VITE_API_BASE_URL."
  value       = aws_api_gateway_stage.api.invoke_url
}

output "clave_privada_archivo" {
  description = "Ruta del archivo con la clave privada SSH (gitignorado)."
  value       = local_file.clave_privada.filename
}
