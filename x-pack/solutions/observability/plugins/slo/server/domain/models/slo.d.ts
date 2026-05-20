import type { sloDefinitionSchema, sloIdSchema, storedSloDefinitionSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';
type SLODefinition = t.TypeOf<typeof sloDefinitionSchema>;
type StoredSLODefinition = t.OutputOf<typeof storedSloDefinitionSchema>;
type SLOId = t.TypeOf<typeof sloIdSchema>;
export type { SLODefinition, StoredSLODefinition, SLOId };
