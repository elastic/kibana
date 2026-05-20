import type { z } from '@kbn/zod/v4';
/**
 * Base schema for all Observability agent-builder attachments.
 * Each attachment can override its UI label by providing an `attachmentLabel`,
 */
export declare const observabilityAttachmentDataSchema: z.ZodObject<{
    attachmentLabel: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
