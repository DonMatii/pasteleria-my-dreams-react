# ---------------------------------------------------------------------------
# API Gateway (v1 replicada + rutas v2)
#
# Evidencia de la topología real:
#   - README de catalogo-service: acceso centralizado "con enrutamiento de
#     proxy (/{proxy+})" => REST API con integración HTTP_PROXY.
#   - README del frontend: el proxy de Vite emula en local la API Gateway de
#     AWS con /api/productos -> :8080, /api/pedidos -> :8082,
#     /api/estadisticas -> :8081. La v2 agrega /api/notificaciones -> :8083.
#   - La autenticación (JWT y header X-Api-Key) vive en los servicios
#     (JwtUniversalAuthFilter), por eso el gateway queda con authorization NONE.
#
# Se modela simplemente: una REST API con un prefijo de ruta por servicio y
# proxy hacia la IP pública de su EC2. Si la guía del profe prescribe otra
# forma, se ajusta aquí (los routes son el único punto de cambio).
# ---------------------------------------------------------------------------

resource "aws_api_gateway_rest_api" "api" {
  name = "pasteleria-my-dreams"
}

# Recurso raíz compartido: /api
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "api"
}

locals {
  # Prefijos de ruta y puerto de cada microservicio (valores estáticos).
  rutas_api = {
    catalogo = {
      prefijo = "productos"
      puerto  = 8080
    }
    estadisticas = {
      prefijo = "estadisticas"
      puerto  = 8081
    }
    pedidos = {
      prefijo = "pedidos"
      puerto  = 8082
    }
    notificaciones = {
      prefijo = "notificaciones"
      puerto  = 8083
    }
  }

  # Destino por servicio: IP pública de su EC2. Se mantiene separado de
  # rutas_api para que for_each solo reciba valores conocidos en plan.
  hosts_api = {
    catalogo       = aws_instance.catalogo.public_ip
    estadisticas   = aws_instance.estadisticas.public_ip
    pedidos        = aws_instance.pedidos.public_ip
    notificaciones = aws_instance.notificaciones.public_ip
  }
}

# /api/<servicio> — coincidencia exacta (p. ej. GET /api/estadisticas).
resource "aws_api_gateway_resource" "ruta" {
  for_each    = local.rutas_api
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = each.value.prefijo
}

# /api/<servicio>/{proxy+} — subrutas (p. ej. /api/productos/3 o
# /api/pedidos/seguimiento/<codigo>).
resource "aws_api_gateway_resource" "ruta_proxy" {
  for_each    = local.rutas_api
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.ruta[each.key].id
  path_part   = "{proxy+}"
}

# Método ANY (cualquier verbo HTTP) sobre la coincidencia exacta.
resource "aws_api_gateway_method" "ruta" {
  for_each      = local.rutas_api
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.ruta[each.key].id
  http_method   = "ANY"
  authorization = "NONE"
}

# Integración HTTP_PROXY: reenvía la petición tal cual al EC2 destino.
resource "aws_api_gateway_integration" "ruta" {
  for_each                = local.rutas_api
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.ruta[each.key].id
  http_method             = aws_api_gateway_method.ruta[each.key].http_method
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${local.hosts_api[each.key]}:${each.value.puerto}/api/${each.value.prefijo}"
}

# Método ANY sobre el comodín {proxy+}, declarando el parámetro de ruta.
resource "aws_api_gateway_method" "ruta_proxy" {
  for_each      = local.rutas_api
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.ruta_proxy[each.key].id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# Integración proxy del comodín: {proxy} en la URI se reemplaza por el tramo
# de ruta restante, mapeado desde la petición.
resource "aws_api_gateway_integration" "ruta_proxy" {
  for_each                = local.rutas_api
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.ruta_proxy[each.key].id
  http_method             = aws_api_gateway_method.ruta_proxy[each.key].http_method
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${local.hosts_api[each.key]}:${each.value.puerto}/api/${each.value.prefijo}/{proxy}"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

# Despliegue con triggers: si cambia cualquier ruta/método/integración se
# genera un nuevo despliegue en el próximo apply.
resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api.id,
      [for r in aws_api_gateway_resource.ruta : r.id],
      [for m in aws_api_gateway_method.ruta : m.id],
      [for i in aws_api_gateway_integration.ruta : i.id],
      [for r in aws_api_gateway_resource.ruta_proxy : r.id],
      [for m in aws_api_gateway_method.ruta_proxy : m.id],
      [for i in aws_api_gateway_integration.ruta_proxy : i.id],
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Stage de ejecución: su nombre define la URL base de invocación del frontend.
resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.apigw_stage
}
