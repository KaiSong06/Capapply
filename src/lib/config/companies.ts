import type { CompanyConfig } from "@/lib/domain/types";

export const curatedCompanies: CompanyConfig[] = [
  { company: "Stripe", boardToken: "stripe" },
  { company: "Datadog", boardToken: "datadog" },
];

export function findCompanyByBoardToken(boardToken: string): CompanyConfig | null {
  return curatedCompanies.find((company) => company.boardToken === boardToken) ?? null;
}
