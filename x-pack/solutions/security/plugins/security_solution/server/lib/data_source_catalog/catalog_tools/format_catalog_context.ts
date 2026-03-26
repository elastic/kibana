/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceEntry } from '@kbn/data-source-catalog';

export function formatCatalogContextForPrompt(entries: DataSourceEntry[], maxEntries = 15): string {
  if (entries.length === 0) return '';

  const limited = entries.slice(0, maxEntries);

  const lines = limited.map((entry) => {
    const parts = [`- **${entry.name}** (${entry.type})`];

    if (entry.integration) {
      parts.push(
        `  Integration: ${entry.integration.package_title} — ${entry.integration.description}`
      );
    }

    if (entry.stats) {
      parts.push(
        `  Data: ${entry.stats.doc_count.toLocaleString()} docs, freshness: ${
          entry.stats.freshness_category
        }`
      );
    }

    const topFields = entry.mapping.fields
      .filter((f) => f.ecs)
      .slice(0, 8)
      .map((f) => f.name);
    if (topFields.length > 0) {
      parts.push(`  Key fields: ${topFields.join(', ')}`);
    }

    return parts.join('\n');
  });

  return [
    '## Available Data Sources',
    '',
    'The following Elasticsearch data sources are available in this environment:',
    '',
    ...lines,
  ].join('\n');
}
