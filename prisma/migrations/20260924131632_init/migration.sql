-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'MESERO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('RETIRO', 'DOMICILIO');

-- CreateEnum
CREATE TYPE "TipoReserva" AS ENUM ('MESA', 'EVENTO');

-- CreateEnum
CREATE TYPE "ModalidadEvento" AS ENUM ('EN_LOCAL', 'ENTREGA');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CUMPLIDA', 'NO_LLEGO', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('PENDIENTE_COBRO', 'REALIZADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "OrigenVenta" AS ENUM ('SALON', 'MOSTRADOR', 'PEDIDO_WEB');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'QR', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "ZonaMesa" AS ENUM ('INTERIOR', 'EXTERIOR', 'SOFA', 'BARRA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoriaId" TEXT NOT NULL,
    "precioCentavos" INTEGER,
    "imagenUrl" TEXT,
    "modeloArUrl" TEXT,
    "modeloArIosUrl" TEXT,
    "aptoMascotas" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "zona" "ZonaMesa" NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "reservable" BOOLEAN NOT NULL DEFAULT true,
    "permiteVariasCuentas" BOOLEAN NOT NULL DEFAULT false,
    "aceptaMascotas" BOOLEAN NOT NULL DEFAULT true,
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaBloqueado" (
    "fecha" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "reservaId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaBloqueado_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "entrega" "TipoEntrega" NOT NULL DEFAULT 'RETIRO',
    "direccionEntrega" TEXT,
    "fechaDeseada" DATE NOT NULL,
    "horaDeseada" TEXT,
    "detalles" TEXT,
    "totalAcordadoCentavos" INTEGER,
    "motivoRechazo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestionadoEn" TIMESTAMP(3),
    "gestionadoPorId" TEXT,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitarioCentavos" INTEGER,
    "nota" TEXT,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoReserva" NOT NULL,
    "modalidad" "ModalidadEvento",
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT,
    "personas" INTEGER,
    "ocasion" TEXT,
    "conMascota" BOOLEAN NOT NULL DEFAULT false,
    "detalles" TEXT,
    "mesaId" TEXT,
    "motivoRechazo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestionadoEn" TIMESTAMP(3),
    "gestionadoPorId" TEXT,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaMesa" (
    "reservaId" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,

    CONSTRAINT "ReservaMesa_pkey" PRIMARY KEY ("reservaId","mesaId")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'PENDIENTE_COBRO',
    "origen" "OrigenVenta" NOT NULL DEFAULT 'SALON',
    "mesaId" TEXT,
    "pedidoId" TEXT,
    "reservaId" TEXT,
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "metodoPago" "MetodoPago",
    "referenciaPago" TEXT,
    "registradaPorId" TEXT NOT NULL,
    "cobradaPorId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cobradaEn" TIMESTAMP(3),
    "anuladaMotivo" TEXT,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioCentavos" INTEGER NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalle" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ajuste" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_activo_idx" ON "Producto"("categoriaId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_nombre_key" ON "Mesa"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "DiaBloqueado_reservaId_key" ON "DiaBloqueado"("reservaId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_codigo_key" ON "Pedido"("codigo");

-- CreateIndex
CREATE INDEX "Pedido_estado_creadoEn_idx" ON "Pedido"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Pedido_fechaDeseada_idx" ON "Pedido"("fechaDeseada");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_codigo_key" ON "Reserva"("codigo");

-- CreateIndex
CREATE INDEX "Reserva_fecha_estado_idx" ON "Reserva"("fecha", "estado");

-- CreateIndex
CREATE INDEX "Reserva_mesaId_fecha_idx" ON "Reserva"("mesaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numero_key" ON "Venta"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_pedidoId_key" ON "Venta"("pedidoId");

-- CreateIndex
CREATE INDEX "Venta_estado_creadaEn_idx" ON "Venta"("estado", "creadaEn");

-- CreateIndex
CREATE INDEX "Venta_mesaId_estado_idx" ON "Venta"("mesaId", "estado");

-- CreateIndex
CREATE INDEX "Venta_cobradaEn_idx" ON "Venta"("cobradaEn");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Auditoria_creadoEn_idx" ON "Auditoria"("creadoEn");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaBloqueado" ADD CONSTRAINT "DiaBloqueado_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaBloqueado" ADD CONSTRAINT "DiaBloqueado_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_gestionadoPorId_fkey" FOREIGN KEY ("gestionadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_gestionadoPorId_fkey" FOREIGN KEY ("gestionadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaMesa" ADD CONSTRAINT "ReservaMesa_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaMesa" ADD CONSTRAINT "ReservaMesa_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_cobradaPorId_fkey" FOREIGN KEY ("cobradaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
