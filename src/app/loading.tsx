/** Instant feedback while a route segment streams in. */
export default function Loading() {
  return (
    <div className="animate-fade-up" aria-busy="true" aria-live="polite">
      <div className="card mb-5 p-6">
        <div className="mx-auto h-4 w-28 rounded-full bg-[var(--bg)]" />
        <div className="mx-auto mt-4 h-7 w-3/4 max-w-xl rounded-full bg-[var(--bg)]" />
        <div className="mx-auto mt-3 h-3 w-1/2 max-w-sm rounded-full bg-[var(--bg)]" />
      </div>
      <div className="card p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3 h-9 rounded-xl bg-[var(--bg)]" />
        ))}
      </div>
      <span className="sr-only">جارٍ التحميل...</span>
    </div>
  );
}
