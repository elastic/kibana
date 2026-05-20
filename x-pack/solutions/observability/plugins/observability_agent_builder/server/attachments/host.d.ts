import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
declare const hostDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    hostName: z.ZodString;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>;
export type HostAttachmentData = z.infer<typeof hostDataSchema>;
export declare function createHostAttachmentType({ logger, dataRegistry, }: {
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_HOST_ATTACHMENT_TYPE_ID, HostAttachmentData>;
export {};
