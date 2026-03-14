"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { InvoiceActionState } from "@/app/(workspace)/invoices/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

type CustomerOption = {
  id: string;
  name: string;
};

type DraftLineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

const blankLineItem = (): DraftLineItem => ({
  description: "",
  quantity: "",
  unitPrice: "",
  taxRate: "0",
});

export function InvoiceForm({
  customers,
  action,
}: {
  customers: CustomerOption[];
  action: (
    state: InvoiceActionState,
    formData: FormData,
  ) => Promise<InvoiceActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([blankLineItem()]);
  const [issueDate, setIssueDate] = useState("");

  const totals = lineItems.reduce(
    (summary, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const lineSubtotal = quantity * unitPrice;
      const lineTax = lineSubtotal * (taxRate / 100);

      return {
        subtotal: summary.subtotal + lineSubtotal,
        tax: summary.tax + lineTax,
      };
    },
    { subtotal: 0, tax: 0 },
  );

  const totalAmount = totals.subtotal + totals.tax;

  function updateLineItem(
    index: number,
    field: keyof DraftLineItem,
    value: string,
  ) {
    setLineItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addLineItem() {
    setLineItems((current) => [...current, blankLineItem()]);
  }

  function removeLineItem(index: number) {
    setLineItems((current) =>
      current.length === 1
        ? current.map((item, itemIndex) =>
            itemIndex === index ? blankLineItem() : item,
          )
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-2xl border border-[rgba(217,72,95,0.22)] bg-[rgba(217,72,95,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <input
        type="hidden"
        name="lineItemsJson"
        value={JSON.stringify(lineItems)}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Customer
          </span>
          <select
            name="customerId"
            required
            className="form-select"
            defaultValue=""
          >
            <option value="" disabled>
              Select customer
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Invoice number
          </span>
          <input
            name="invoiceNumber"
            required
            minLength={2}
            placeholder="INV-3001"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Issue date
          </span>
          <input
            name="issueDate"
            type="date"
            required
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Due date
          </span>
          <input
            name="dueDate"
            type="date"
            required
            min={issueDate || undefined}
            className="form-input"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Fallback amount
          </span>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Used only if no valid line items are added"
            className="form-input"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Status
          </span>
          <select
            name="status"
            defaultValue="sent"
            className="form-select"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Delivery channel
          </span>
          <input
            name="deliveryChannel"
            placeholder="email"
            className="form-input"
          />
        </label>
      </div>

      <div className="soft-panel rounded-[24px] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Invoice line items
            </p>
            <p className="text-sm text-[rgba(22,33,31,0.62)]">
              Totals are calculated from the rows below.
            </p>
          </div>
          <button
            type="button"
            onClick={addLineItem}
            className="secondary-button gap-2"
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div
              key={`line-item-${index}`}
              className="rounded-[20px] border border-[var(--stroke)] bg-[var(--surface-muted)]/55 p-4"
            >
              <div className="grid gap-4 md:grid-cols-[1.7fr_0.5fr_0.7fr_0.6fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                    Description
                  </span>
                  <input
                    value={item.description}
                    onChange={(event) =>
                      updateLineItem(index, "description", event.target.value)
                    }
                    className="form-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                    Qty
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      updateLineItem(index, "quantity", event.target.value)
                    }
                    className="form-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                    Unit price
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updateLineItem(index, "unitPrice", event.target.value)
                    }
                    className="form-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                    Tax %
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.taxRate}
                    onChange={(event) =>
                      updateLineItem(index, "taxRate", event.target.value)
                    }
                    className="form-input"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="secondary-button h-[50px] px-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 rounded-[20px] border border-[var(--stroke)] bg-white p-5 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
              Subtotal
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              ${totals.subtotal.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
              Tax
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              ${totals.tax.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Notes
        </span>
        <textarea
          name="notes"
          rows={4}
          className="form-textarea"
        />
      </label>

      <FormSubmitButton
        label="Create invoice"
        pendingLabel="Creating invoice..."
      />
    </form>
  );
}
