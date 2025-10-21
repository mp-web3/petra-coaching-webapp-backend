/*
  Warnings:

  - You are about to drop the column `disclosureAccepted` on the `Consent` table. All the data in the column will be lost.
  - You are about to drop the column `disclosureVersion` on the `Consent` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "tosAccepted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Consent" ("createdAt", "id", "ipAddress", "orderId", "tosAccepted", "userAgent") SELECT "createdAt", "id", "ipAddress", "orderId", "tosAccepted", "userAgent" FROM "Consent";
DROP TABLE "Consent";
ALTER TABLE "new_Consent" RENAME TO "Consent";
CREATE UNIQUE INDEX "Consent_orderId_key" ON "Consent"("orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
