import { z } from 'zod';

export const RespondReviewSchema = z.object({
  response: z
    .string()
    .min(10, { message: 'Tanggapan minimal 10 karakter' })
    .max(1000, { message: 'Tanggapan maksimal 1000 karakter' }),
});

export type RespondReviewDto = z.infer<typeof RespondReviewSchema>;