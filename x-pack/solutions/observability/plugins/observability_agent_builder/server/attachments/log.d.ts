import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
import { OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID } from '../../common';
declare const logDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    id: z.ZodString;
    index: z.ZodString;
}, z.core.$strip>;
export type LogAttachmentData = z.infer<typeof logDataSchema>;
export declare function createLogAttachmentType({ core, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID, LogAttachmentData>;
export {};
