"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { parseImeis } from "@/lib/imei";
import { toNumber, toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";

function parseBatches(formData: FormData) {
  const products = formData.getAll("batchProduct");
  const brands = formData.getAll("batchBrand");
  const colors = formData.getAll("batchColor");
  const networks = formData.getAll("batchNetwork");
  const grades = formData.getAll("batchGrade");
  const gbp = formData.getAll("batchCostGbp");
  const imeiFields = formData.getAll("batchImeis");
  const qtys = formData.getAll("batchQty");
  const batches = [];
  for (let i = 0; i < products.length; i += 1) {
    batches.push({
      productName: String(products[i] ?? "").trim(),
      brand: toOptionalString(brands[i]),
      color: String(colors[i] ?? "").trim(),
      network: String(networks[i] ?? "").trim(),
      grade: String(grades[i] ?? "").trim(),
      costGbp: toNumber(gbp[i]),
      imeis: parseImeis(String(imeiFields[i] ?? "")),
      qty: toNumber(qtys[i]),
    });
  }
  return batches;
}

export async function receiveStockBatches(formData: FormData, options?: { fromPo?: boolean }) {
  const { apiToken } = await requireUser();
  const supplierId = toOptionalString(formData.get("supplierId"));
  const purchaseOrderId = toOptionalString(formData.get("purchaseOrderId"));
  const postLedger = formData.get("postLedger") === "on" || Boolean(options?.fromPo);
  const batches = parseBatches(formData);

  let result: { unitsAdded: number };
  try {
    result = await apiClient.post<{ unitsAdded: number }>(
      "/stock",
      { supplierId, purchaseOrderId, postLedger, batches },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath("/stock");
  revalidatePath("/suppliers");
  revalidatePath("/purchase-orders");
  redirect(
    purchaseOrderId
      ? `/purchase-orders/${purchaseOrderId}?ok=Stock received`
      : `/stock?ok=${result.unitsAdded} units added`,
  );
}

export async function addStock(formData: FormData) {
  return receiveStockBatches(formData);
}

export async function getAvailableImeis(
  spec: { productName: string; color: string; network: string; grade: string },
  limit = 1000,
) {
  const { apiToken } = await requireUser();
  const params = new URLSearchParams({ ...spec, limit: String(limit) });
  return apiClient.get<string[]>(`/stock/available-imeis?${params}`, apiToken);
}

export async function updateStockUnitImei(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const imei = String(formData.get("imei") ?? "").trim();

  try {
    await apiClient.patch(`/stock/${id}/imei`, { imei }, apiToken);
  } catch (err) {
    if (err instanceof ApiError) redirect(`/stock?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  revalidatePath("/stock");
  redirect("/stock?ok=IMEI updated");
}

export async function getStockUnit(id: string) {
  const { apiToken } = await requireUser();
  return apiClient.get<{
    id: string;
    imei: string | null;
    productName: string;
    brand: string | null;
    color: string;
    network: string;
    grade: string;
    costGbp: number;
    status: string;
    supplierId: string | null;
    supplier: { id: string; name: string } | null;
    invoice: { id: string; invoiceNumber: string } | null;
  }>(`/stock/${id}`, apiToken);
}

export async function updateStockUnit(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.patch(
      `/stock/${id}`,
      {
        productName: String(formData.get("productName") ?? "").trim(),
        brand: toOptionalString(formData.get("brand")),
        color: String(formData.get("color") ?? "").trim(),
        network: String(formData.get("network") ?? "").trim(),
        grade: String(formData.get("grade") ?? "").trim(),
        costGbp: toNumber(formData.get("costGbp")),
        supplierId: toOptionalString(formData.get("supplierId")),
        imei: toOptionalString(formData.get("imei")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) redirect(`/stock/${id}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }

  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
  redirect(`/stock/${id}?ok=Saved`);
}

export async function searchStockProducts(query: string) {
  const { apiToken } = await requireUser();
  const params = new URLSearchParams({ q: query });
  return apiClient.get<
    {
      productName: string;
      color: string;
      network: string;
      grade: string;
      count: number;
      costGbp: number;
      supplierName: string | null;
    }[]
  >(`/stock/search-products?${params}`, apiToken);
}
