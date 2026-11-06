export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6">
      <div className="h-8 w-48 rounded-lg bg-surface-3" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-surface-3/70" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-xl bg-surface-3/70" />
        ))}
      </div>
    </div>
  );
}
