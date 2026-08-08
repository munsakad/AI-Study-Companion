export default function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
