import { cloneElement, isValidElement } from "react";
import type { InputHTMLAttributes, ReactElement, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass = "mt-2 min-h-12 w-full rounded-[0.85rem_0.95rem_0.8rem_0.92rem] border border-[#b4c0b7] bg-[rgba(255,255,252,0.94)] px-4 text-[var(--ink)] placeholder:text-[#8a9690] hover:border-[var(--sage)] disabled:cursor-not-allowed disabled:bg-[#efeee8] disabled:text-[#7f8882]";

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="paper-note border-[rgba(49,86,66,0.14)] bg-[rgba(255,253,246,0.92)] p-5 md:p-6">
      <legend className="rounded-[0.65rem_0.8rem_0.65rem_0.75rem] bg-[var(--sage-soft)] px-3 py-1.5 text-base font-black text-[var(--sage-dark)] md:text-lg">{title}</legend>
      {description && <p className="mb-5 text-sm leading-6 text-[var(--muted)]">{description}</p>}
      <div className="grid gap-5">{children}</div>
    </fieldset>
  );
}

export function Field({ label, htmlFor, hint, required, children }: { label: string; htmlFor: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  const hintId = `${htmlFor}-hint`;
  const element = children as ReactElement<{ "aria-describedby"?: string }>;
  const control = hint && isValidElement(children)
    ? cloneElement(element, { "aria-describedby": [element.props["aria-describedby"], hintId].filter(Boolean).join(" ") })
    : children;
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-extrabold">{label}{required && <span className="ml-1 text-[#a24f42]" aria-label="필수">*</span>}</label>
      {control}
      {hint && <p id={hintId} className="mt-2 text-xs leading-5 text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-28 resize-y py-3 leading-6 ${props.className || ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className || ""}`} />;
}
