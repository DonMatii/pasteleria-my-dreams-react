# ---------------------------------------------------------------------------
# RDS MySQL (v1 replicada): instancia única de laboratorio.
# Restricción de Learner Lab: sin recursos IAM (iam_database_auth_enabled
# queda apagado) y sin instance profiles.
# ---------------------------------------------------------------------------

# Subnet group con las subredes de la VPC por defecto. RDS exige subredes en
# al menos dos AZs; la VPC default del lab las tiene. No se crea VPC propia.
resource "aws_db_subnet_group" "pasteleria" {
  name        = "pasteleria-my-dreams"
  description = "Subredes de la VPC por defecto usadas por RDS"
  subnet_ids  = sort(data.aws_subnets.default.ids)
}

resource "aws_db_instance" "pasteleria" {
  identifier     = "pasteleria-my-dreams"
  engine         = "mysql"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  db_name           = var.db_name

  username = var.db_username
  password = var.db_password

  # Acceso público (práctica de lab, documentado en la tarea): el SG solo abre
  # 3306 al SG web y a admin_cidr.
  publicly_accessible = true

  db_subnet_group_name   = aws_db_subnet_group.pasteleria.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # Estado efímero del laboratorio: sin snapshot final, sin protección de
  # borrado y cambios aplicados de inmediato. El catálogo v1 se restaura desde
  # 8_Digital_Proyects/dump-v1-productos.sql después del apply.
  skip_final_snapshot = true
  deletion_protection = false
  apply_immediately   = true

  tags = {
    Name = "pasteleria-my-dreams-db"
  }
}
