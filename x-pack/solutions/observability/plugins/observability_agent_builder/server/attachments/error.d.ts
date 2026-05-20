import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
declare const errorDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    errorId: z.ZodString;
    serviceName: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    start: z.ZodOptional<z.ZodString>;
    end: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ErrorAttachmentData = z.infer<typeof errorDataSchema>;
export declare function createErrorAttachmentType({ logger, dataRegistry, }: {
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID, ErrorAttachmentData>;
export {};
