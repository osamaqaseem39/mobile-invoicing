-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "printCurrency" TEXT NOT NULL DEFAULT 'GBP',
ADD COLUMN     "fxRate" DOUBLE PRECISION NOT NULL DEFAULT 1.15;

-- The Europe/EUR series is numbered N0001, N0002, … off its own counter. That
-- counter was left behind when the old dual-entity model was removed, so resume
-- it from the highest N-number already issued rather than restarting at 1 and
-- colliding with a historical invoice number.
INSERT INTO "NumberCounter" ("key", "value")
SELECT 'INV_NI', COALESCE(MAX(SUBSTRING("invoiceNumber" FROM 2)::int), 0)
FROM "Invoice"
WHERE "invoiceNumber" ~ '^N[0-9]+$'
ON CONFLICT ("key") DO UPDATE
  SET "value" = GREATEST("NumberCounter"."value", EXCLUDED."value");

INSERT INTO "NumberCounter" ("key", "value")
SELECT 'RMA_NI', COALESCE(MAX(SUBSTRING("rmaNumber" FROM 2)::int), 0)
FROM "Rma"
WHERE "rmaNumber" ~ '^N[0-9]+$'
ON CONFLICT ("key") DO UPDATE
  SET "value" = GREATEST("NumberCounter"."value", EXCLUDED."value");
