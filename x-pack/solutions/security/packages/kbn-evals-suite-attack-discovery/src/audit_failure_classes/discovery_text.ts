/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

export interface FieldToken {
  field: string;
  value: string;
}

const TOKEN_PATTERN = /\{\{\s*([A-Za-z_@][\w.@-]*)\s+(.+?)\s*\}\}/g;

/** The markdown a reader sees for a discovery; titles are plain text and carry no tokens. */
export const getDiscoveryMarkdown = (discovery: AttackDiscovery): string =>
  [discovery.summaryMarkdown, discovery.detailsMarkdown, discovery.entitySummaryMarkdown]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n');

/** Parses the `{{ field value }}` tokens the default prompt asks models to emit. */
export const parseFieldTokens = (markdown: string): FieldToken[] =>
  Array.from(markdown.matchAll(TOKEN_PATTERN), ([, field, value]) => ({ field, value }));
