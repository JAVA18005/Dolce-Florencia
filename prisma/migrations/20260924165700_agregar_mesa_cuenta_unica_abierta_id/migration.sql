-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "mesaCuentaUnicaAbiertaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Venta_mesaCuentaUnicaAbiertaId_key" ON "Venta"("mesaCuentaUnicaAbiertaId");
