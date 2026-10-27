import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { TransactionResponse } from "../domain/transactions";

export const server = setupServer(
  http.get("http://localhost/expenses", () => HttpResponse.json([])),
  http.get("http://localhost/income", () => HttpResponse.json([])),
);

export function createResponseGate() {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { ready, release };
}

export function createTransactionRecords(initial: TransactionResponse[] = []) {
  let records = [...initial];
  return {
    list: () => HttpResponse.json(records),
    save: (record: TransactionResponse) => {
      records = records.some((current) => current.id === record.id)
        ? records.map((current) =>
            current.id === record.id ? record : current,
          )
        : [record, ...records];
      return HttpResponse.json(record);
    },
    remove: (id: number) => {
      records = records.filter((record) => record.id !== id);
      return new HttpResponse(null, { status: 204 });
    },
  };
}
