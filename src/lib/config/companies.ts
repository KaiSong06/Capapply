import type { CompanyConfig } from "@/lib/domain/types";
import { demoCompany } from "../demo/demo-content";

export const curatedCompanies: CompanyConfig[] = [
  demoCompany,
];

export function findCompanyByBoardToken(boardToken: string): CompanyConfig | null {
  return curatedCompanies.find((company) => company.boardToken === boardToken) ?? null;
}
