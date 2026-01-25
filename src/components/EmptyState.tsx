interface EmptyStateProps {
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: string
}

export function EmptyState({ title, message, action, icon = '📭' }: EmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">{icon}</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
