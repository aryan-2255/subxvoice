import type { ReactNode } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
      {children && <p className="mt-1 max-w-xl text-muted">{children}</p>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}
