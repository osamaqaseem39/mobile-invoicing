import type { PrintCurrency } from "./money";

export const company = {
  legalName: "Atlantic Devices Solutions LTD",
  tradingName: "Atlantic Devices Solutions LTD",
  shortName: "Atlantic",
  companyNo: "NI742244",
  vatNumber: "GB048681389",
  eoriNumber: "GB048681389000",
  address: {
    line1: "12-16 Bridge Street",
    line2: "",
    postcode: "BT1 1LU",
    city: "Belfast",
    country: "United Kingdom",
  },
  phoneDisplay: "+447561400005",
  whatsappDisplay: "+447561400005",
  email: "atlanticdevicessolutions@gmail.com",
  bank: {
    GBP: {
      bankName: "Tide",
      accountName: "Echo logic tech ltd",
      sortCode: "08-71-99",
      accountNumber: "14800963",
    },
    EUR: {
      bankName: "Wise",
      accountName: "Atlantic Devices Solutions LTD",
      iban: "BE85 9059 6137 6606",
      swift: "TRWIBEB1XXX",
      bankAddress: ["Rue du Trone 100, 3rd Floor", "Brussels, 1050", "Belgium"],
    },
  },
} as const;

export function companyAddressLines() {
  const { line1, line2, postcode, city, country } = company.address;
  return [line1, line2, `${postcode} ${city}`, country].filter(Boolean) as string[];
}

/** Bank block for the currency the document is printed in. */
export function bankDetailLines(currency: PrintCurrency = "GBP") {
  if (currency === "EUR") {
    const bank = company.bank.EUR;
    return [
      `Bank Name: ${bank.bankName}`,
      `Account Name: ${bank.accountName}`,
      `IBAN: ${bank.iban}`,
      `Swift/BIC: ${bank.swift}`,
      `Bank Address: ${bank.bankAddress.join(", ")}`,
    ];
  }
  const bank = company.bank.GBP;
  return [
    `Bank Name: ${bank.bankName}`,
    `Account Name: ${bank.accountName}`,
    `Sort code: ${bank.sortCode}`,
    `Account: ${bank.accountNumber}`,
  ];
}
