export default function Loading() {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="Veritas Logo" 
          className="w-24 h-24 object-contain animate-pulse mb-6 drop-shadow-xl" 
        />
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-on-surface-variant animate-pulse font-medium">Loading...</p>
      </div>
    </div>
  );
}
