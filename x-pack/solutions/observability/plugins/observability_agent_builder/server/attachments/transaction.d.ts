import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID } from '../../common';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';
declare const transactionDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
    serviceName: z.ZodString;
    transactionName: z.ZodString;
    transactionType: z.ZodString;
    traceId: z.ZodOptional<z.ZodString>;
    transactionId: z.ZodOptional<z.ZodString>;
    start: z.ZodString;
    end: z.ZodString;
}, z.core.$strip>;
export type TransactionAttachmentData = z.infer<typeof transactionDataSchema>;
export declare function createTransactionAttachmentType({ logger, dataRegistry, }: {
    logger: Logger;
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
}): AttachmentTypeDefinition<typeof OBSERVABILITY_TRANSACTION_ATTACHMENT_TYPE_ID, TransactionAttachmentData>;
export {};
