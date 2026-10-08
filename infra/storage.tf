# ---------------------------------------------------------------------------
# S3: hosting del sitio estático del frontend React (build de Vite).
#
# FUERA DE TERRAFORM — restricción del Learner Lab:
# el Service Control Policy de la cuenta AWS Academy deniega con 403
# s3:GetBucketObjectLockConfiguration y el proveedor AWS lo invoca al
# refrescar aws_s3_bucket, lo que rompe cualquier `terraform plan` futuro
# (issue conocida: hashicorp/terraform-provider-aws#7550/#17433; no hay
# permiso que conceder porque la denegación es explícita a nivel organización).
# Por eso el bucket se crea y configura A MANO en la consola, igual que en la
# v1. Pasos (una sola vez):
#   1. Crear bucket con el nombre de var.web_bucket_name.
#   2. Properties > Static website hosting > Enable, index.html + error.html.
#   3. Permissions > Block all public access > Off (4 flags).
#   4. Permissions > Bucket policy > pegar la política de solo lectura:
#      {"Version":"2012-10-17","Statement":[{"Sid":"LecturaPublicaSitioEstatico",
#      "Effect":"Allow","Principal":"*","Action":["s3:GetObject"],
#      "Resource":["arn:aws:s3::<nombre-del-bucket>/*"]}]}
# El archivo del sitio se sube con el build (aws s3 sync o consola).
# Detalle completo en odd/tasks/terraform-esqueleto.md.
# ---------------------------------------------------------------------------
