import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID } from '../../common/constants';
import type { ObservabilityAgentBuilderCoreSetup } from '../types';
declare const alertDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    alertId: z.ZodString;
}, z.core.$strip>;
export type AlertAttachmentData = z.infer<typeof alertDataSchema>;
export declare function createAlertAttachmentType({ core, logger, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID, AlertAttachmentData>;
export {};
