import { z } from 'zod'

export const LocationDataSchema = z.object({
  name: z.string(),
  formattedAddress: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  placeId: z.string().optional(),
})

export type LocationData = z.infer<typeof LocationDataSchema>
