import { useId, useRef, useState } from "react";
import {
  displayCalendarDate,
  isCalendarDate,
  parseCalendarDate,
} from "../../domain/transactions/dates";

type DateInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function DateInput({
  label,
  value,
  onChange,
  required,
  disabled,
  className,
}: DateInputProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const valid = !value || isCalendarDate(value);
  const text = value && valid ? displayCalendarDate(value) : value;
  const date = new Date(`${month || "2000-01"}-01T00:00:00Z`);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const lastDay = new Date(date);
  lastDay.setUTCMonth(monthIndex + 1, 0);
  const days = lastDay.getUTCDate();
  const offset = (date.getUTCDay() + 6) % 7;

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function shiftMonth(direction: number) {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + direction);
    setMonth(next.toISOString().slice(0, 7));
  }

  return (
    <div
      className='min-w-0 max-w-full space-y-1.5 text-sm text-slate-200'
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className='flex min-w-0 items-center gap-2'>
        <input
          id={id}
          type='text'
          placeholder='dd/mm/yyyy'
          autoComplete='off'
          maxLength={10}
          value={text}
          required={required}
          disabled={disabled}
          aria-invalid={!valid}
          aria-describedby={`${id}-help`}
          ref={(input) => input?.setCustomValidity(
            valid ? "" : "Enter a valid date in dd/mm/yyyy format.",
          )}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(parseCalendarDate(raw) ?? raw);
          }}
          className={`min-w-0 ${className ?? "w-full rounded border border-slate-600 bg-slate-900 p-2 text-white"}`}
        />
        <button
          ref={trigger}
          type='button'
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-expanded={open && !disabled}
          aria-controls={`${id}-calendar`}
          disabled={disabled}
          onClick={() => {
            if (!open) {
              const today = new Date();
              setMonth(
                value && valid
                  ? value.slice(0, 7)
                  : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
              );
            }
            setOpen(!open);
          }}
          className='shrink-0 rounded border border-slate-500 p-2 text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-50'
        >
          <svg
            aria-hidden='true'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <rect x='3' y='5' width='18' height='16' rx='2' />
            <path d='M16 3v4M8 3v4M3 11h18' />
          </svg>
        </button>
      </div>
      <p id={`${id}-help`} className={valid ? "sr-only" : "text-rose-300"}>
        {valid
          ? "Date format: dd/mm/yyyy."
          : "Enter a valid date in dd/mm/yyyy format."}
      </p>
      {open && !disabled && (
        <section
          id={`${id}-calendar`}
          aria-label={`${label} calendar`}
          className='w-full max-w-xs rounded border border-slate-500 bg-slate-900 p-3 shadow-lg'
        >
          <div className='flex items-center justify-between gap-2'>
            <button
              type='button'
              aria-label='Previous month'
              disabled={year === 1 && monthIndex === 0}
              onClick={() => shiftMonth(-1)}
              className='rounded p-2 hover:bg-slate-700'
            >
              {"<"}
            </button>
            <p aria-live='polite' className='font-semibold text-white'>
              {monthFormatter.format(date)}
            </p>
            <button
              type='button'
              aria-label='Next month'
              disabled={year === 9999 && monthIndex === 11}
              onClick={() => shiftMonth(1)}
              className='rounded p-2 hover:bg-slate-700'
            >
              {">"}
            </button>
          </div>
          <div className='grid grid-cols-7 gap-1 text-center'>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
              <span key={day} aria-hidden='true' className='py-1 text-xs text-slate-400'>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: days }, (_, index) => {
              const day = `${month}-${String(index + 1).padStart(2, "0")}`;
              return (
                <button
                  key={day}
                  type='button'
                  aria-label={displayCalendarDate(day)}
                  aria-pressed={value === day}
                  onClick={() => {
                    onChange(day);
                    close();
                  }}
                  className={`rounded py-2 text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${value === day ? "bg-sky-700" : ""}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button
            type='button'
            onClick={close}
            className='mt-2 rounded px-2 py-1 text-white hover:bg-slate-700'
          >
            Close calendar
          </button>
        </section>
      )}
    </div>
  );
}
