import { motion, useMotionValue, useTransform } from 'framer-motion'
import type { DriveImage } from '../services/googleDriveApi'
import { buildDriveImageUrl } from '../utils/imageUrl'

interface SwipeCardProps {
  photo: DriveImage
  onSwipeLeft: () => void
  onSwipeRight: () => void
  disabled?: boolean
}

const SWIPE_THRESHOLD = 100

export function SwipeCard({ photo, onSwipeLeft, onSwipeRight, disabled = false }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (disabled) return
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeRight()
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipeLeft()
    }
  }

  // Build image URL - use high resolution Drive thumbnail
  const imageUrl = buildDriveImageUrl(photo.id)

  return (
    <motion.div
      data-testid="swipe-card"
      className={`absolute w-full max-w-2xl h-full max-h-[70vh] bg-gray-900 rounded-2xl shadow-xl overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ x, rotate, opacity }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={disabled ? undefined : { cursor: 'grabbing' }}
    >
      <img
        src={imageUrl}
        alt={photo.name}
        className="w-full h-full object-contain"
        draggable={false}
      />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-white font-medium truncate">{photo.name}</p>
      </div>

      {/* Swipe indicators */}
      <motion.div
        className="absolute top-4 left-4 px-4 py-2 bg-red-500 text-white font-bold rounded-lg border-4 border-red-600"
        style={{
          opacity: useTransform(x, [-100, 0], [1, 0]),
          rotate: -12,
        }}
      >
        NOPE
      </motion.div>
      <motion.div
        className="absolute top-4 right-4 px-4 py-2 bg-green-500 text-white font-bold rounded-lg border-4 border-green-600"
        style={{
          opacity: useTransform(x, [0, 100], [0, 1]),
          rotate: 12,
        }}
      >
        KEEP
      </motion.div>
    </motion.div>
  )
}
