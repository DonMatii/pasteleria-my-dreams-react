# Provider AWS: región parametrizada y etiquetas comunes (default_tags)
# aplicadas a todos los recursos del módulo raíz.

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "pasteleria-my-dreams"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
