"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { parseImeis } from "@/lib/imei";
import { toNumber, toOptionalNumber, toOptionalString } from "@/lib/lookups";
import { apiClient, ApiError } from "@/lib/api-client";
import type { InvoiceDoc } from "@/components/invoice-document";

export async function getInvoicePreview(id: string) {
  const { apiToken } = await requireUser();
  return apiClient.get<InvoiceDoc>(`/invoices/${id}`, apiToken);
}

function parseInvoiceLines(formData: FormData) {
  const products = formData.getAll("lineProduct");
  const colors = formData.getAll("lineColor");
  const networks = formData.getAll("lineNetwork");
  const grades = formData.getAll("lineGrade");
  const qtys = formData.getAll("lineQty");
  const gbp = formData.getAll("linePriceGbp");
  const buyGbp = formData.getAll("lineBuyPriceGbp");
  const imeis = formData.getAll("lineImeis");
  const lines = [];
  for (let i = 0; i < products.length; i += 1) {
    lines.push({
      productName: String(products[i] ?? "").trim(),
      color: String(colors[i] ?? "").trim(),
      network: String(networks[i] ?? "").trim(),
      grade: String(grades[i] ?? "").trim(),
      qty: toNumber(qtys[i], 0),
      unitPriceGbp: toNumber(gbp[i]),
      buyPriceGbp: toNumber(buyGbp[i]),
      imeis: parseImeis(String(imeis[i] ?? "")),
    });
  }
  return lines;
}

export async function createInvoice(formData: FormData) {
  const { apiToken } = await requireUser();
  const lines = parseInvoiceLines(formData);
  // Each ticked credit note carries its own amount box, so a credit can be applied in part.
  const appliedRmaCredits = formData
    .getAll("appliedRmaIds")
    .map(String)
    .filter(Boolean)
    .map((rmaId) => ({
      rmaId,
      amountGbp: toOptionalNumber(formData.get(`appliedRmaAmount-${rmaId}`)),
    }));

  let invoice: { id: string };
  try {
    invoice = await apiClient.post<{ id: string }>(
      "/invoices",
      {
        customerId: String(formData.get("customerId") ?? ""),
        status: String(formData.get("status") ?? "PENDING"),
        shippingCostGbp: toNumber(formData.get("shippingCostGbp")),
        shippingLabel: toOptionalString(formData.get("shippingLabel")),
        paymentTerms: toOptionalString(formData.get("paymentTerms")),
        warrantyTerms: toOptionalString(formData.get("warrantyTerms")),
        notes: toOptionalString(formData.get("notes")),
        marginVatScheme: formData.get("marginVatScheme") === "on",
        appliedRmaCredits,
        initialPaymentGbp: toOptionalNumber(formData.get("initialPaymentGbp")),
        installmentCount:
          formData.get("installmentPlanEnabled") === "on"
            ? toOptionalNumber(formData.get("installmentCount"))
            : undefined,
        installmentStartDate: toOptionalString(formData.get("installmentStartDate")),
        installmentIntervalDays: toOptionalNumber(formData.get("installmentIntervalDays")),
        lines,
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/invoices");
  revalidatePath("/stock");
  redirect(`/invoices/${invoice.id}?ok=Invoice created`);
}

export async function updateInvoiceStatus(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "PENDING");

  try {
    await apiClient.patch(`/invoices/${id}`, { status }, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) redirect("/invoices");
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/stock");
  redirect(`/invoices/${id}?ok=Status updated`);
}

export async function updateInvoiceShipping(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.patch(
      `/invoices/${id}/shipping`,
      {
        shippingCostGbp: toNumber(formData.get("shippingCostGbp")),
        shippingLabel: toOptionalString(formData.get("shippingLabel")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?ok=Shipping updated`);
}

export async function updateInvoiceMarginVat(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.patch(
      `/invoices/${id}/margin-vat`,
      { marginVatScheme: formData.get("marginVatScheme") === "on" },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?ok=Margin VAT setting updated`);
}

export async function updateInvoiceLine(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const lineId = String(formData.get("lineId") ?? "");

  try {
    await apiClient.patch(
      `/invoices/${id}/lines/${lineId}`,
      {
        productName: String(formData.get("productName") ?? "").trim(),
        color: toOptionalString(formData.get("color")),
        network: toOptionalString(formData.get("network")),
        grade: toOptionalString(formData.get("grade")),
        qty: toNumber(formData.get("qty")),
        unitPriceGbp: toNumber(formData.get("unitPriceGbp")),
        buyPriceGbp: toNumber(formData.get("buyPriceGbp")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/stock");
  redirect(`/invoices/${id}?ok=Line updated`);
}

export async function addInvoiceLine(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.post(
      `/invoices/${id}/lines`,
      {
        productName: String(formData.get("productName") ?? "").trim(),
        color: toOptionalString(formData.get("color")),
        network: toOptionalString(formData.get("network")),
        grade: toOptionalString(formData.get("grade")),
        qty: toNumber(formData.get("qty")),
        unitPriceGbp: toNumber(formData.get("unitPriceGbp")),
        buyPriceGbp: toNumber(formData.get("buyPriceGbp")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/stock");
  redirect(`/invoices/${id}?ok=Line added`);
}

/** Appends a query param, preserving any the caller already put on the path. */
function withParam(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

export async function sendInvoiceEmail(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const email = toOptionalString(formData.get("email"));
  const returnTo = String(formData.get("returnTo") ?? `/invoices/${id}`);
  const currency = formData.get("currency") === "EUR" ? "EUR" : "GBP";
  const rate = Number(formData.get("rate"));

  let result: { sentTo: string };
  try {
    result = await apiClient.post<{ sentTo: string }>(
      `/invoices/${id}/send-email`,
      currency === "EUR" && rate > 0 ? { email, currency, rate } : { email },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(withParam(returnTo, "error", err.message));
    }
    throw err;
  }

  redirect(
    withParam(
      returnTo,
      "ok",
      `Invoice emailed to ${result.sentTo}${currency === "EUR" ? " in EUR" : ""}`,
    ),
  );
}

export async function recordInvoicePayment(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.post(
      `/invoices/${id}/payments`,
      {
        amountGbp: toNumber(formData.get("amountGbp")),
        method: toOptionalString(formData.get("method")),
        notes: toOptionalString(formData.get("notes")),
        paidAt: toOptionalString(formData.get("paidAt")),
        rmaId: toOptionalString(formData.get("rmaId")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?ok=Payment recorded`);
}

export async function updateInvoicePayment(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");

  try {
    await apiClient.patch(
      `/invoices/${id}/payments/${paymentId}`,
      {
        amountGbp: toNumber(formData.get("amountGbp")),
        method: toOptionalString(formData.get("method")),
        notes: toOptionalString(formData.get("notes")),
        paidAt: toOptionalString(formData.get("paidAt")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?ok=Payment updated`);
}

export async function createInstallmentPlan(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");

  try {
    await apiClient.post(
      `/invoices/${id}/installments/plan`,
      {
        count: toNumber(formData.get("count")),
        startDate: toOptionalString(formData.get("startDate")),
        intervalDays: toOptionalNumber(formData.get("intervalDays")),
      },
      apiToken,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?ok=Installment plan created`);
}

export async function payInstallment(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const installmentId = String(formData.get("installmentId") ?? "");

  try {
    await apiClient.patch(`/invoices/${id}/installments/${installmentId}/pay`, {}, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?ok=Installment marked as paid`);
}

export async function updateInvoiceLineImeis(formData: FormData) {
  const { apiToken } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const lineId = String(formData.get("lineId") ?? "");
  const imeis = parseImeis(String(formData.get("imeis") ?? ""));

  try {
    await apiClient.patch(`/invoices/${id}/lines/${lineId}/imeis`, { imeis }, apiToken);
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/invoices/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/stock");
  redirect(`/invoices/${id}?ok=IMEIs updated`);
}
