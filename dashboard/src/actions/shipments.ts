"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { toNumber, toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";

export async function createShipment(formData: FormData) {
  const { apiToken } = await requireUser();

  let shipment: { id: string };
  try {
    shipment = await apiClient.post<{ id: string }>(
      "/shipments",
      {
        invoiceId: String(formData.get("invoiceId") ?? ""),
        trackingNumber: toOptionalString(formData.get("trackingNumber")),
        carrier: toOptionalString(formData.get("carrier")),
        shippingCostGbp: toNumber(formData.get("shippingCostGbp")),
        actualCostGbp: toNumber(formData.get("actualCostGbp")),
        status: String(formData.get("status") ?? "PREPARING"),
        notes: toOptionalString(formData.get("notes")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath("/shipments");
  redirect(`/shipments/${shipment.id}?ok=Shipment added`);
}

export async function updateShipment(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  await apiClient.patch(
    `/shipments/${id}`,
    {
      trackingNumber: toOptionalString(formData.get("trackingNumber")),
      carrier: toOptionalString(formData.get("carrier")),
      shippingCostGbp: toNumber(formData.get("shippingCostGbp")),
      actualCostGbp: toNumber(formData.get("actualCostGbp")),
      status: String(formData.get("status") ?? "PREPARING"),
      notes: toOptionalString(formData.get("notes")),
    },
    apiToken,
  );
  revalidatePath(`/shipments/${id}`);
  redirect(`/shipments/${id}?ok=Updated`);
}
