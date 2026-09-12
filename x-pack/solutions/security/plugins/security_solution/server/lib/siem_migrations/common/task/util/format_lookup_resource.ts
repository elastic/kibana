/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichedLookupResource } from './enrich_lookup_resources';

export const formatLookupResourcesContext = (lookups: EnrichedLookupResource[]): string => {
  const resourceBlocks = lookups
    .filter((lookup) => lookup.content)
    .map((lookup) => {
      const fields = (lookup.fields ?? [])
        .map(
          (field) =>
            `<field name="${escapeXmlAttribute(field.path)}" type="${escapeXmlAttribute(
              field.type
            )}" />`
        )
        .join('\n');
      const fieldsBlock = fields
        ? `
<fields>
${fields}
</fields>`
        : '';

      return `<lookup_resource source_name="${escapeXmlAttribute(
        lookup.name
      )}" index="${escapeXmlAttribute(lookup.content)}">${fieldsBlock}
</lookup_resource>`;
    });

  if (!resourceBlocks.length) {
    return '';
  }

  return `
<lookup_resources>
${resourceBlocks.join('\n')}
</lookup_resources>`;
};

const escapeXmlAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
