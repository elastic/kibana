import { z } from '@kbn/zod/v4';
/**
 * Single source of truth for the Observability alert attachment metadata
 * shape. Used by the registry validator on both server and client.
 *
 * The unified-reference dispatcher passes `attachment.metadata` to this
 * validator (not the full payload), so we only validate the metadata bag
 * here. A follow-up will unify the dispatcher contract across reference and
 * value attachments and let validators inspect the entire payload.
 *
 * All fields are optional to remain compatible with legacy/in-flight metadata,
 * but when present they must conform to the expected types.
 */
export declare const ObservabilityAlertAttachmentMetadata: z.ZodObject<{
    index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    rule: z.ZodOptional<z.ZodUnion<readonly [z.ZodNull, z.ZodObject<{
        id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
export type ObservabilityAlertAttachmentMetadata = z.infer<typeof ObservabilityAlertAttachmentMetadata>;
/**
 * Decodes and validates Observability alert attachment metadata.
 * Throws `ZodError` on failure; callers can surface this as `badRequest` at
 * the boundary if desired.
 */
export declare const decodeObservabilityAlert: (metadata: unknown) => ObservabilityAlertAttachmentMetadata;
