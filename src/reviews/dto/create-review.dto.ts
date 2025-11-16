import { z } from 'zod';

export const CreateReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, { message: 'Rating minimal 1 bintang' })
    .max(5, { message: 'Rating maksimal 5 bintang' }),
  
  comment: z
    .string()
    .min(10, { message: 'Komentar minimal 10 karakter' })
    .max(1000, { message: 'Komentar maksimal 1000 karakter' }),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;