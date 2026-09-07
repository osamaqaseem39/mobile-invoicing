"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { toNumber, toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";

function parsePoLines(formData: FormData) {
  const productNames = formData.getAll("lineProduct");
  const colors = formData.getAll("lineColor");
  const networks = formData.getAll("lineNetwork");
  const grades = formData.getAll("lineGrade");
  const qtys = formData.getAll("lineQty");
  const gbp = formData.getAll("lineCostGbp");
  const lines = [];
  for (let i = 0; i < productNames.length; i += 1) {
    lines.push({
      productName: String(productNames[i] ?? "").trim(),
      color: toOptionalString(colors[i]),
      network: toOptionalString(networks[i]),
      grade: toOptionalString(grades[i]),
      qty: toNumber(qtys[i], 0),
      unitCostGbp: toNumber(gbp[i]),
    });
  }
  return lines;
}

async function uploadPoAttachment(id: string, formData: FormData, apiToken: string | null) {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) return;

  const uploadForm = new FormData();
  uploadForm.set("file", file, file.name);
  await apiClient.post(`/purchase-orders/${id}/attachment`, uploadForm, apiToken);
}

export async function createPurchaseOrder(formData: FormData) {
  const { apiToken } = await requireUser();
  const lines = parsePoLines(formData);

  let po: { id: string };
  try {
    po = await apiClient.post<{ id: string }>(
      "/purchase-orders",
      {
        supplierId: String(formData.get("supplierId") ?? ""),
        status: String(formData.get("status") ?? "ORDERED"),
        notes: toOptionalString(formData.get("notes")),
        shippingCostGbp: toNumber(formData.get("shippingCostGbp")),
        lines,
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  try {
    await uploadPoAttachment(po.id, formData, apiToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Attachment upload failed";
    revalidatePath("/purchase-orders");
    redirect(
      `/purchase-orders/${po.id}?error=${encodeURIComponent(`Purchase order created, but the attachment failed: ${message}`)}`,
    );
  }

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${po.id}?ok=Purchase order created`);
}

export async function updatePurchaseOrderMeta(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const lines = formData.has("lineProduct") ? parsePoLines(formData) : undefined;

  try {
    await apiClient.patch(
      `/purchase-orders/${id}`,
      {
        status: String(formData.get("status") ?? "ORDERED"),
        notes: toOptionalString(formData.get("notes")),
        shippingCostGbp: toNumber(formData.get("shippingCostGbp")),
        actualCostGbp: toNumber(formData.get("actualCostGbp")),
        lines,
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/purchase-orders/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  try {
    await uploadPoAttachment(id, formData, apiToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Attachment upload failed";
    revalidatePath(`/purchase-orders/${id}`);
    redirect(`/purchase-orders/${id}?error=${encodeURIComponent(`Saved, but the attachment failed: ${message}`)}`);
  }

  revalidatePath(`/purchase-orders/${id}`);
  redirect(`/purchase-orders/${id}?ok=Updated`);
}

export async function removePoAttachment(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.delete(`/purchase-orders/${id}/attachment`, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/purchase-orders/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/purchase-orders/${id}`);
  redirect(`/purchase-orders/${id}?ok=Attachment removed`);
}

export async function receivePurchaseOrder(formData: FormData) {
  const { receiveStockBatches } = await import("@/actions/stock");
  await receiveStockBatches(formData, { fromPo: true });
}
