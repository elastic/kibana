import type { transformHealthSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';
type TransformHealth = t.OutputOf<typeof transformHealthSchema>;
export type { TransformHealth };
