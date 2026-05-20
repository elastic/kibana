import type { z } from '@kbn/zod';
import type { compositeSloDefinitionSchema, storedCompositeSloDefinitionSchema } from '@kbn/slo-schema';
type CompositeSLODefinition = z.infer<typeof compositeSloDefinitionSchema>;
type StoredCompositeSLODefinition = z.infer<typeof storedCompositeSloDefinitionSchema>;
export type { CompositeSLODefinition, StoredCompositeSLODefinition };
