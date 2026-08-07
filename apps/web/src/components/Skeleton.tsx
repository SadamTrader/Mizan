export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
