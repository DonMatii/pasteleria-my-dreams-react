# ---------------------------------------------------------------------------
# S3: hosting del sitio estático del frontend React (build de Vite).
# El bucket tiene nombre globalmente único (variable con default
# distintivo); si ya está en uso, cambiarlo en terraform.tfvars.
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "web" {
  bucket = var.web_bucket_name
}

# El bloqueo de acceso público viene activado por defecto en buckets nuevos;
# se desactiva para permitir el sitio estático público.
resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# SPA de una sola página: cualquier ruta sin archivo vuelve a index.html.
resource "aws_s3_bucket_website_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Política de solo lectura para el objeto del sitio. jsonencode evita
# declarar data sources con "iam" en el nombre (restricción de lab: el
# recurso resultante es una política de bucket, no un recurso IAM).
resource "aws_s3_bucket_policy" "web" {
  bucket     = aws_s3_bucket.web.id
  depends_on = [aws_s3_bucket_public_access_block.web]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "LecturaPublicaSitioEstatico"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject"]
        Resource  = ["${aws_s3_bucket.web.arn}/*"]
      }
    ]
  })
}
