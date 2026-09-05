import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { INVOICE_STATUSES } from "../../common/status";

class InvoiceLineDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  network?: string | null;

  @IsOptional()
  @IsString()
  grade?: string | null;

  @IsNumber()
  qty: number;

  @IsOptional()
  @IsNumber()
  unitPriceGbp?: number;

  @IsOptional()
  @IsNumber()
  buyPriceGbp?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imeis?: string[];
}

class AppliedRmaCreditDto {
  @IsString()
  rmaId: string;

  /** Omit to apply the credit note's whole remaining balance. */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountGbp?: number;
}

export class CreateInvoiceDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCostGbp?: number;

  @IsOptional()
  @IsString()
  shippingLabel?: string | null;

  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @IsOptional()
  @IsString()
  warrantyTerms?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  marginVatScheme?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliedRmaIds?: string[];

  /** Credit notes to apply, each with an optional part-amount (defaults to its full balance). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppliedRmaCreditDto)
  appliedRmaCredits?: AppliedRmaCreditDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPaymentGbp?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  installmentCount?: number;

  @IsOptional()
  @IsDateString()
  installmentStartDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  installmentIntervalDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];
}

export class UpdateInvoiceStatusDto {
  @IsIn(INVOICE_STATUSES)
  status: string;
}

export class UpdateInvoiceShippingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCostGbp?: number;

  @IsOptional()
  @IsString()
  shippingLabel?: string | null;
}

export class UpdateInvoiceMarginVatDto {
  @IsBoolean()
  marginVatScheme: boolean;
}

export class UpdateInvoiceLineImeisDto {
  @IsArray()
  @IsString({ each: true })
  imeis: string[];
}

export class UpdateInvoiceLineDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  network?: string | null;

  @IsOptional()
  @IsString()
  grade?: string | null;

  @IsNumber()
  qty: number;

  @IsOptional()
  @IsNumber()
  unitPriceGbp?: number;

  @IsOptional()
  @IsNumber()
  buyPriceGbp?: number;
}

export class SendInvoiceEmailDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  message?: string;

  /** Currency the attached PDF is rendered in. Defaults to GBP. */
  @IsOptional()
  @IsIn(["GBP", "EUR"])
  currency?: "GBP" | "EUR";

  /** GBP -> EUR conversion rate, required in practice when currency is EUR. */
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  rate?: number;
}

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01)
  amountGbp: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  rmaId?: string;
}

export class CreateInstallmentPlanDto {
  @IsNumber()
  @Min(2)
  count: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  intervalDays?: number;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountGbp?: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class PayInstallmentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountGbp?: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
