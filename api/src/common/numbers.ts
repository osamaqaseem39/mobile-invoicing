import type { Prisma } from "@prisma/client";

export async function nextNumberTx(
  tx: Prisma.TransactionClient,
  key: string,
  prefix = "",
  separator = "-",
) {
  const row = await tx.numberCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  const padded = String(row.value).padStart(4, "0");
  return prefix ? `${prefix}${separator}${padded}` : padded;
}

/**
 * Documents run one number series per region. GBP/UK keeps the plain 4-digit
 * series the business has always used (0012); EUR/Europe gets an "N" prefix
 * (N0012) off its own counter, so the two never collide.
 *
 * The counter keys keep their historical `_UK`/`_NI` names on purpose: both
 * series then continue from the numbers already issued under the old dual-entity
 * model rather than restarting at 0001 and reusing a number.
 */
export function nextDocumentNumberTx(
  tx: Prisma.TransactionClient,
  series: "INV" | "RMA",
  currency: string,
) {
  return currency === "EUR"
    ? nextNumberTx(tx, `${series}_NI`, "N", "")
    : nextNumberTx(tx, `${series}_UK`, "", "");
}
