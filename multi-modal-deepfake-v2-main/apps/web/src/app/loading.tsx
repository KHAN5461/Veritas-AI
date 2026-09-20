export default function Loading() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-on-surface-variant animate-pulse">Loading forensics workspace...</p>
    </div>
  );
}
