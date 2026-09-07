"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { toNumber, toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";

export async function createSupplier(formData: FormData) {
  const { apiToken } = await requireUser();
  let supplier: { id: string };
  try {
    supplier = await apiClient.post<{ id: string }>(
      "/suppliers",
      {
        name: String(formData.get("name") ?? "").trim(),
        phone: toOptionalString(formData.get("phone")),
        email: toOptionalString(formData.get("email")),
        address: toOptionalString(formData.get("address")),
        vatNumber: toOptionalString(formData.get("vatNumber")),
        notes: toOptionalString(formData.get("notes")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}?ok=Supplier added`);
}

export async function updateSupplier(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  try {
    await apiClient.patch(
      `/suppliers/${id}`,
      {
        name: String(formData.get("name") ?? "").trim(),
        phone: toOptionalString(formData.get("phone")),
        email: toOptionalString(formData.get("email")),
        address: toOptionalString(formData.get("address")),
        vatNumber: toOptionalString(formData.get("vatNumber")),
        notes: toOptionalString(formData.get("notes")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) redirect(`/suppliers/${id}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}?ok=Saved`);
}

export async function deleteSupplier(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  try {
    await apiClient.delete(`/suppliers/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) redirect("/suppliers");
      redirect(`/suppliers/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath("/suppliers");
  redirect("/suppliers?ok=Supplier deleted");
}

export async function addLedgerEntry(formData: FormData) {
  const { apiToken } = await requireUser();
  const supplierId = String(formData.get("supplierId") ?? "");
  try {
    await apiClient.post(
      `/suppliers/${supplierId}/ledger`,
      {
        type: String(formData.get("type") ?? "DEBIT"),
        amountGbp: toNumber(formData.get("amountGbp")),
        date: toOptionalString(formData.get("date")),
        reference: toOptionalString(formData.get("reference")),
        notes: toOptionalString(formData.get("notes")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/suppliers/${supplierId}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath(`/suppliers/${supplierId}`);
  redirect(`/suppliers/${supplierId}?ok=Hisab updated`);
}
