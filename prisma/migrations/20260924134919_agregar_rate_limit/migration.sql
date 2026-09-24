-- CreateTable
CREATE TABLE "PeticionRateLimit" (
    "clave" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 1,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeticionRateLimit_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE INDEX "PeticionRateLimit_expiraEn_idx" ON "PeticionRateLimit"("expiraEn");
