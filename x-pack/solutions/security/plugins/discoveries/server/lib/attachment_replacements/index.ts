/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/** The most replacements an Attack Discovery attachment carries. */
export const MAX_REPLACEMENTS = 1000;

/** The longest original value an attachment carries. */
export const MAX_REPLACEMENT_VALUE_LENGTH = 1024;

/** Anonymized values are UUIDs, which keeps the replacements' keys, and their count, bounded. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The replacements an Attack Discovery attachment carries: anonymized UUID to original value. */
export const attachmentReplacementsSchema = z
  .record(z.string().regex(UUID), z.string().max(MAX_REPLACEMENT_VALUE_LENGTH))
  .refine((replacements) => Object.keys(replacements).length <= MAX_REPLACEMENTS, {
    message: `Too many replacements; at most ${MAX_REPLACEMENTS} are allowed`,
  });

/**
 * Returns the persisted replacements an attachment can carry: only the entries `texts` use, that
 * the attachment schema accepts, bounded to its size, or `undefined` when there are none.
 *
 * A discovery persists the replacements of every alert its generation run anonymized, which
 * covers the other discoveries of that run too. Keeping only the ones this discovery uses matches
 * what "Add to chat" sends. Attachments re-validate their data when the agent reads them, so one
 * entry the schema rejects would drop the whole attachment rather than just that value.
 */
export const getAttachmentReplacements = ({
  replacements,
  texts,
}: {
  replacements: Record<string, string> | undefined;
  texts: string[];
}): Record<string, string> | undefined => {
  const used = Object.entries(replacements ?? {})
    .filter(
      ([anonymized, original]) =>
        UUID.test(anonymized) &&
        original.length <= MAX_REPLACEMENT_VALUE_LENGTH &&
        texts.some((text) => text.includes(anonymized))
    )
    .slice(0, MAX_REPLACEMENTS);

  return used.length > 0 ? Object.fromEntries(used) : undefined;
};
