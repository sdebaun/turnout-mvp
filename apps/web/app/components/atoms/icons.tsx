import { Calendar, MapPin } from 'lucide-react'
import type { ComponentProps } from 'react'

// Canonical icon wrappers — size and strokeWidth are fixed so these icons
// always render consistently. Pass className, aria-hidden, etc. through as needed.

type IconProps = Omit<ComponentProps<typeof Calendar>, 'size' | 'strokeWidth'>

export function CalendarIcon(props: IconProps) {
  return <Calendar size={16} strokeWidth={1.75} {...props} />
}

export function MapPinIcon(props: IconProps) {
  return <MapPin size={16} strokeWidth={1.75} {...props} />
}
