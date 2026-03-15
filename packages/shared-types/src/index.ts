export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type CurrencyCode = "USD";

export type Nullable<T> = T | null;
export type ValueOf<T> = T[keyof T];

export interface AuditFields {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface MoneyAmount {
  amountInCents: number;
  currency: CurrencyCode;
}

export type RecordStatus = "draft" | "active" | "inactive" | "archived";
