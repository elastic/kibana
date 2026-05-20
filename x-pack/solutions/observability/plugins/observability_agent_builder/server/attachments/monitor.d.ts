import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
declare const monitorDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    configId: z.ZodString;
    monitorName: z.ZodString;
    monitorType: z.ZodString;
}, z.core.$strip>;
export type MonitorAttachmentData = z.infer<typeof monitorDataSchema>;
export declare function createMonitorAttachmentType({ logger, dataRegistry, }: {
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID, MonitorAttachmentData>;
export {};
