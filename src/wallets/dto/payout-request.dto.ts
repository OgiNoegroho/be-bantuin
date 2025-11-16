import { z } from 'zod';

export const CreatePayoutRequestSchema = z.object({
  amount: z
    .number()
    .positive({ message: 'Jumlah penarikan harus lebih dari 0' })
    .min(50000, { message: 'Minimal penarikan Rp 50.000' }), // Set minimal
  payoutAccountId: z
    .string()
    .cuid({ message: 'ID rekening bank tidak valid' }),
});

export type CreatePayoutRequestDto = z.infer<typeof CreatePayoutRequestSchema>;