-- CreateTable: Fridge
CREATE TABLE "Fridge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🧊',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Fridge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Fridge → FamilyGroup
ALTER TABLE "Fridge" ADD CONSTRAINT "Fridge_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Fridge → User
ALTER TABLE "Fridge" ADD CONSTRAINT "Fridge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: insert default "主冰箱 🧊" for every existing FamilyGroup
INSERT INTO "Fridge" ("id", "name", "emoji", "familyId", "createdById", "createdAt")
SELECT
    gen_random_uuid()::TEXT,
    '主冰箱',
    '🧊',
    fg."id",
    fg."createdById",
    NOW()
FROM "FamilyGroup" fg;

-- AddColumn: FridgeItem.fridgeId (nullable first so existing rows don't break)
ALTER TABLE "FridgeItem" ADD COLUMN "fridgeId" TEXT;

-- DataMigration: point each FridgeItem at its family's new default Fridge
UPDATE "FridgeItem" fi
SET "fridgeId" = f."id"
FROM "Fridge" f
WHERE f."familyId" = fi."familyId";

-- Now make fridgeId NOT NULL (all rows should have a value)
ALTER TABLE "FridgeItem" ALTER COLUMN "fridgeId" SET NOT NULL;

-- Drop old FK + column
ALTER TABLE "FridgeItem" DROP CONSTRAINT "FridgeItem_familyId_fkey";
ALTER TABLE "FridgeItem" DROP COLUMN "familyId";

-- AddForeignKey: FridgeItem → Fridge
ALTER TABLE "FridgeItem" ADD CONSTRAINT "FridgeItem_fridgeId_fkey" FOREIGN KEY ("fridgeId") REFERENCES "Fridge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
