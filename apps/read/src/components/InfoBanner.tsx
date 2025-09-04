export default function InfoBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg border border-blue-500">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-white/80 hover:text-white ml-4 text-lg leading-none"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
} 