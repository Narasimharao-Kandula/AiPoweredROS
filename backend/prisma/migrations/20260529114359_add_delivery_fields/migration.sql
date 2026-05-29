-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PICKED_UP';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryPersonId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
