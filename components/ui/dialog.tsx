"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAVY = "#1e3a5f";

type DialogCtxValue = { open: boolean; onOpenChange: (open: boolean) => void };
const DialogCtx = React.createContext<DialogCtxValue>({ open: false, onOpenChange: () => {} });

function Dialog({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogCtx.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </DialogCtx.Provider>
  );
}

function DialogTrigger({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DialogCtx);
  return (
    <button type="button" {...props} onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = React.useContext(DialogCtx);
  return (
    <div
      className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) {
  const { open, onOpenChange } = React.useContext(DialogCtx);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      {/* Koyu overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Kart */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-[calc(100%-2rem)] sm:max-w-md",
          "rounded-xl overflow-hidden border border-border bg-card shadow-2xl",
          "p-6",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* X butonu — navy header üzerinde */}
        {showCloseButton && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-3.5 z-10 rounded-sm text-white/60 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Kapat</span>
          </button>
        )}
        {children}
      </div>
    </>,
    document.body
  );
}

/** Navy arka planlı başlık alanı — DialogContent'in p-6 dolgusu içinde negatif margin ile genişler */
function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-6 -mt-6 mb-5 px-6 py-4 pr-12", className)}
      style={{ backgroundColor: NAVY }}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-sm font-semibold text-white leading-none", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-xs", className)}
      style={{ color: "rgba(255,255,255,0.55)" }}
      {...props}
    />
  );
}

/** Açık arka planlı alt alan — DialogContent'in p-6 dolgusu içinde negatif margin ile genişler */
function DialogFooter({
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showCloseButton,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }) {
  return (
    <div
      className={cn(
        "-mx-6 -mb-6 mt-5 px-6 py-4",
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "border-t border-border bg-muted/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogClose({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = React.useContext(DialogCtx);
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
