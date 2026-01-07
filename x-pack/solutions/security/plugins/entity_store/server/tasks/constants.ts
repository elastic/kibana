
import { z } from '@kbn/zod';

export type EntityStoreTaskType = z.infer<typeof EntityStoreTaskType>;
export const EntityStoreTaskType = z.enum(['extractEntity']);
