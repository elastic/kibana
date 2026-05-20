import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
declare const sloDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    sloId: z.ZodString;
    sloInstanceId: z.ZodOptional<z.ZodString>;
    remoteName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SloAttachmentData = z.infer<typeof sloDataSchema>;
export declare function createSloAttachmentType({ logger, dataRegistry, }: {
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_SLO_ATTACHMENT_TYPE_ID, SloAttachmentData>;
export {};
