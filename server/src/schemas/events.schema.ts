import {boolean, z} from 'zod'
import { required } from 'zod/mini';

const optionalBoolSchema = (defaultValue = false) => z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const str = String(val).trim().toLowerCase();
    if (['1', 'true', 'yes'].includes(str)) return true;
    if (['0', 'false', 'no'].includes(str)) return false;
    return undefined;
  }).pipe(z.boolean().optional())
    .default(defaultValue);

export const RowEnum = z.enum(['A', 'B', 'C', 'D']);


export const userSectionSchema = {
  // Paramètres d'URL (:row)
  params: z.object({
    row: RowEnum,
  }),
  // Paramètres de query (?asc=true)
  querystring: z.object({
    asc: optionalBoolSchema(true)
  }),
};


export const eventSchema = {
  params: z.object({
    id: z.string().optional()
  }),
  querystring : z.object({
      seats: optionalBoolSchema(false)
  })
}

export const lockSeatSchema = {
  // Paramètres d'URL (:row)
  params: z.object({
    row: RowEnum,
    number: z.coerce.number().min(1).max(10)
  })
};