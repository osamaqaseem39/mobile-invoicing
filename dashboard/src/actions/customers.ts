"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CustomerLookup } from "@/lib/lookups";

export async function searchCustomers(query: string) {
  const { apiToken } = await requireUser();
  const params = new URLSearchParams({ q: query });
  return apiClient.get<CustomerLookup[]>(`/customers?${params}`, apiToken);
}

export async function createCustomer(formData: FormData) {
  const { apiToken } = await requireUser();
  const returnTo = toOptionalString(formData.get("returnTo"));

  let customer: { id: string };
  try {
    customer = await apiClient.post<{ id: string }>(
      "/customers",
      {
        name: String(formData.get("name") ?? "").trim(),
        businessName: toOptionalString(formData.get("businessName")),
        phone: toOptionalString(formData.get("phone")),
        email: toOptionalString(formData.get("email")),
        vatNumber: toOptionalString(formData.get("vatNumber")),
        address: toOptionalString(formData.get("address")),
        shippingAddress: toOptionalString(formData.get("shippingAddress")),
        notes: toOptionalString(formData.get("notes")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }

  revalidatePath("/customers");
  if (returnTo) {
    const url = new URL(returnTo, "http://internal");
    url.searchParams.set("customerId", customer.id);
    redirect(`${url.pathname}${url.search}`);
  }
  redirect(`/customers/${customer.id}?ok=Customer added`);
}

export async function updateCustomer(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.patch(
      `/customers/${id}`,
      {
        name: String(formData.get("name") ?? "").trim(),
        businessName: toOptionalString(formData.get("businessName")),
        phone: toOptionalString(formData.get("phone")),
        email: toOptionalString(formData.get("email")),
        vatNumber: toOptionalString(formData.get("vatNumber")),
        address: toOptionalString(formData.get("address")),
        shippingAddress: toOptionalString(formData.get("shippingAddress")),
        notes: toOptionalString(formData.get("notes")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/customers/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}?ok=Saved`);
}

export async function deleteCustomer(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  try {
    await apiClient.delete(`/customers/${id}`, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) redirect("/customers");
      redirect(`/customers/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  revalidatePath("/customers");
  redirect("/customers?ok=Customer deleted");
}
