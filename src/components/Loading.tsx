interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Loading({ message = 'Loading...', size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        className={`animate-spin border-blue-500 border-t-transparent rounded-full ${sizeClasses[size]}`}
      />
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  )
}
