import { useEffect, useRef, useState, type FormEvent } from "react";
import { getApiErrorMessage } from "../../../application/api";
import {
  createTransactionDraft,
  draftToPayload,
  transactionToDraft,
} from "../transformations";
import type {
  Transaction,
  TransactionDraft,
  TransactionPayload,
} from "../types";

type PageOperations = {
  singular: "expense" | "income";
  isBusy: boolean;
  save: (payload: TransactionPayload, id: number | null) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
};

export function useTransactionPage({
  singular,
  isBusy,
  save,
  remove,
}: PageOperations) {
  const [form, setForm] = useState<TransactionDraft>(createTransactionDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const mutationPending = useRef(false);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isBusy) mutationPending.current = false;
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(createTransactionDraft());
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy || mutationPending.current) return;
    setError("");
    let payload: TransactionPayload;
    try {
      payload = draftToPayload(form);
    } catch (validationError) {
      setError(getApiErrorMessage(validationError));
      return;
    }
    mutationPending.current = true;
    try {
      await save(payload, editingId);
      resetForm();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    }
  };

  const handleFormChange = (field: keyof TransactionDraft, value: string) => {
    if (isBusy || mutationPending.current) return;
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleEdit = (transaction: Transaction) => {
    if (isBusy || mutationPending.current) return;
    setEditingId(transaction.id);
    setForm(transactionToDraft(transaction));
    setError("");
    formHeadingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handleCancelEdit = () => {
    if (isBusy || mutationPending.current) return;
    resetForm();
  };

  const handleDelete = async (transaction: Transaction) => {
    if (isBusy || mutationPending.current) return;
    if (!window.confirm(`Delete the ${singular} "${transaction.category}"?`))
      return;
    mutationPending.current = true;
    setDeleteError("");
    try {
      await remove(transaction.id);
      if (editingId === transaction.id) resetForm();
    } catch (removeError) {
      setDeleteError(getApiErrorMessage(removeError));
    }
  };

  return {
    form,
    editingId,
    error,
    deleteError,
    formHeadingRef,
    handleSubmit,
    handleFormChange,
    handleEdit,
    handleCancelEdit,
    handleDelete,
  };
}
