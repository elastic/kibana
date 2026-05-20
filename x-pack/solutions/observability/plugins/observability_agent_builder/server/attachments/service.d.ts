import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
declare const serviceDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    serviceName: z.ZodString;
    environment: z.ZodString;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>;
export type ServiceAttachmentData = z.infer<typeof serviceDataSchema>;
export declare function createServiceAttachmentType({ logger, dataRegistry, }: {
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_SERVICE_ATTACHMENT_TYPE_ID, ServiceAttachmentData>;
export {};
