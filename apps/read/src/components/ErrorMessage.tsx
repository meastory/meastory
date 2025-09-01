interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg border border-red-500">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-white/80 hover:text-white ml-4 text-lg leading-none"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
