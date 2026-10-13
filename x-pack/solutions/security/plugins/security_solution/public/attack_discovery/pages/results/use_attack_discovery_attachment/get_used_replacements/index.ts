/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';

/** The server's bounds for an attachment's `replacements`. */
export const MAX_REPLACEMENTS = 1000;
export const MAX_REPLACEMENT_VALUE_LENGTH = 1024;

/** The server only accepts UUID keys, which is what anonymization generates. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the replacements whose anonymized value appears in `texts`, within the server's
 * bounds, or `undefined` when there are none.
 *
 * A generation's replacements cover every discovery it produced; sending only the ones this
 * discovery uses keeps the attachment small. A replacement the server would reject, one without
 * a UUID key or with a value over the bound, is left out, so it stays anonymized instead of
 * failing the whole attachment.
 */
export const getUsedReplacements = ({
  replacements,
  texts,
}: {
  replacements?: Replacements;
  texts: string[];
}): Replacements | undefined => {
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
