import type { PrintCurrency } from "@/lib/money";

// Echo Logic prints Atlantic's company/VAT/EORI numbers: no separate set has
// been issued for it, so both entities share this block.
const REGISTRATION = {
  companyNo: "NI742244",
  vatNumber: "GB048681389",
  eoriNumber: "GB048681389000",
} as const;

/** Issues GBP invoices; paid into its own Tide account. */
export const echoLogic = {
  legalName: "Echo Logic Tech LTD",
  tradingName: "Echo Logic Tech LTD",
  shortName: "Echo Logic",
  logo: "/echo.jpeg" as string | null,
  ...REGISTRATION,
  address: {
    line1: "51-B Deptford High Street",
    line2: "",
    postcode: "SE8 4AD",
    city: "London",
    country: "United Kingdom",
  },
  phoneDisplay: "07561400005",
  whatsappDisplay: "07561400005",
  email: "echologicltd@gmail.com",
  tagline: "Wholesale operations",
  bank: {
    bankName: "Tide",
    accountName: "Echo Logic Tech LTD",
    sortCode: "08-71-99",
    accountNumber: "14800963",
  },
} as const;

/** Issues EUR invoices; paid into its own Wise account. */
export const atlantic = {
  legalName: "Atlantic Devices Solutions LTD",
  tradingName: "Atlantic Devices Solutions LTD",
  shortName: "Atlantic",
  logo: "/ads.jpeg" as string | null,
  ...REGISTRATION,
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
  tagline: "Wholesale operations",
  bank: {
    bankName: "Wise",
    accountName: "Atlantic Devices Solutions LTD",
    iban: "BE85 9059 6137 6606",
    swift: "TRWIBEB1XXX",
    bankAddress: ["Rue du Trone 100, 3rd Floor", "Brussels, 1050", "Belgium"],
  },
} as const;

export type CompanyEntity = typeof echoLogic | typeof atlantic;

/** App chrome — sidebar and login — is branded with the parent entity. */
export const company = atlantic;

/** The entity that issues, and is paid for, a document printed in `currency`. */
export function companyForCurrency(currency: PrintCurrency = "GBP"): CompanyEntity {
  return currency === "EUR" ? atlantic : echoLogic;
}

export function addressLines(entity: CompanyEntity) {
  const { line1, line2, postcode, city, country } = entity.address;
  return [line1, line2, `${postcode} ${city}`, country].filter(Boolean) as string[];
}

/** Bank block for the entity issuing the document. */
export function bankDetailLines(entity: CompanyEntity) {
  const bank = entity.bank;
  if ("iban" in bank) {
    return [
      `Bank Name: ${bank.bankName}`,
      `Account Name: ${bank.accountName}`,
      `IBAN: ${bank.iban}`,
      `Swift/BIC: ${bank.swift}`,
      `Bank Address: ${bank.bankAddress.join(", ")}`,
    ];
  }
  return [
    `Bank Name: ${bank.bankName}`,
    `Account Name: ${bank.accountName}`,
    `Sort code: ${bank.sortCode}`,
    `Account: ${bank.accountNumber}`,
  ];
}
