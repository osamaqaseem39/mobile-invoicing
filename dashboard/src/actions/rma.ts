"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { toNumber, toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";
import { rmaRemainingCredit } from "@/lib/rma";

export type AvailableRmaCredit = {
  id: string;
  rmaNumber: string;
  status: string;
  invoice: { invoiceNumber: string };
  items: { unitPriceGbp: number }[];
  payments: { amountGbp: number }[];
};

export async function getAvailableRmaCredits(customerId: string) {
  if (!customerId) return [];
  const { apiToken } = await requireUser();
  const rmas = await apiClient.get<
    (AvailableRmaCredit & { paymentType: string })[]
  >(`/rma?customerId=${encodeURIComponent(customerId)}`, apiToken);
  return rmas.filter((rma) => rma.paymentType === "PENDING" && rmaRemainingCredit(rma) > 0);
}

export async function createRma(formData: FormData) {
  const { apiToken } = await requireUser();
  const unitIds = formData.getAll("stockUnitId").map(String).filter(Boolean);

  const manualInvoiceNumbers = formData.getAll("manualInvoiceNumber");
  const manualProductNames = formData.getAll("manualProductName");
  const manualImeis = formData.getAll("manualImei");
  const manualColors = formData.getAll("manualColor");
  const manualGrades = formData.getAll("manualGrade");
  const manualPriceGbp = formData.getAll("manualPriceGbp");
  const manualActions = formData.getAll("manualAction");
  const manualReasons = formData.getAll("manualReason");
  const manualItems = manualProductNames
    .map((_, i) => ({
      invoiceNumber: toOptionalString(manualInvoiceNumbers[i]),
      productName: String(manualProductNames[i] ?? "").trim(),
      imei: toOptionalString(manualImeis[i]),
      color: toOptionalString(manualColors[i]),
      grade: toOptionalString(manualGrades[i]),
      unitPriceGbp: toNumber(manualPriceGbp[i]),
      action: String(manualActions[i] || "RESTOCK"),
      reason: toOptionalString(manualReasons[i]),
    }))
    .filter((item) => item.productName);

  let rma: { id: string };
  try {
    rma = await apiClient.post<{ id: string }>(
      "/rma",
      {
        invoiceId: String(formData.get("invoiceId") ?? ""),
        reason: toOptionalString(formData.get("reason")),
        notes: toOptionalString(formData.get("notes")),
        items: unitIds.map((stockUnitId) => ({
          stockUnitId,
          action: String(formData.get(`action-${stockUnitId}`) || "RESTOCK"),
          reason: toOptionalString(formData.get(`reason-${stockUnitId}`)),
        })),
        manualItems,
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) redirect(`/returns/new?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  revalidatePath("/returns");
  revalidatePath("/stock");
  redirect(`/returns/${rma.id}?ok=RMA created`);
}

export async function applyRmaCredit(formData: FormData) {
  const { apiToken } = await requireUser();
  const rmaId = String(formData.get("rmaId") ?? "");
  const appliedInvoiceId = toOptionalString(formData.get("appliedInvoiceId"));

  try {
    await apiClient.post(
      `/rma/${rmaId}/credit`,
      {
        paymentType: String(formData.get("paymentType") ?? "PENDING"),
        appliedInvoiceId,
        paymentAmountGbp: toNumber(formData.get("paymentAmountGbp")),
        paymentDate: toOptionalString(formData.get("paymentDate")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) redirect("/returns");
      redirect(`/returns/${rmaId}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/returns/${rmaId}`);
  if (appliedInvoiceId) revalidatePath(`/invoices/${appliedInvoiceId}`);
  revalidatePath("/invoices");
  redirect(`/returns/${rmaId}?ok=Credit updated`);
}

export async function applyRmaCreditToInvoice(formData: FormData) {
  const { apiToken } = await requireUser();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const rmaId = String(formData.get("rmaId") ?? "");

  try {
    await apiClient.post(
      `/invoices/${invoiceId}/payments`,
      {
        amountGbp: toNumber(formData.get("amountGbp")),
        rmaId,
        method: "RMA credit",
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/returns");
  redirect(`/invoices/${invoiceId}?ok=RMA credit applied`);
}

export async function processRma(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "RECEIVED");

  try {
    await apiClient.patch(`/rma/${id}`, { status }, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) redirect("/returns");
      redirect(`/returns/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/returns/${id}`);
  revalidatePath("/stock");
  redirect(`/returns/${id}?ok=RMA updated`);
}
