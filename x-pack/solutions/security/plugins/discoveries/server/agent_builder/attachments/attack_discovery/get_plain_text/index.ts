/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderFieldTokens } from '../render_field_tokens';

/** Anonymized values are UUIDs, so one pass over the text finds every candidate. */
const ANONYMIZED_VALUE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Returns the plain text the agent reads for one anonymized markdown field of an Attack
 * Discovery.
 *
 * Tokens are rendered before the original values are inserted, because an original value can
 * contain `}}` or a newline. Original values can be longer than the UUIDs they replace, so the
 * result is truncated to `maxLength`, the field's own bound.
 */
export const getPlainText = ({
  markdown,
  maxLength,
  replacements,
}: {
  markdown: string;
  maxLength: number;
  replacements?: Record<string, string>;
}): string => {
  const rendered = renderFieldTokens(markdown);
  const text =
    replacements != null
      ? rendered.replace(ANONYMIZED_VALUE, (value) => replacements[value] ?? value)
      : rendered;

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};
