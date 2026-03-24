import type { sloTemplateSchema, storedSloTemplateSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';
type SLOTemplate = t.TypeOf<typeof sloTemplateSchema>;
type StoredSLOTemplate = t.TypeOf<typeof storedSloTemplateSchema>;
export type { SLOTemplate, StoredSLOTemplate };
