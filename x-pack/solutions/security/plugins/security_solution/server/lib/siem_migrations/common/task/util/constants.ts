/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TELEMETRY_SIEM_MIGRATION_ID = 'siem_migrations';

export const SYSTEM_INSTRUCTIONS = `

## Extremely important Guidelines - Read Carefully

### General Guidelines
1. Do not use quotes for variables or aliases, replace any in the original with snake cased aliases. Only use quotes when necessary as a string literal.
2. Never adding quotes or ticks to index names.

### Lookup Specific Guidelines.

1. If you encounter any index name starting with \`lookup_\`, it indicates a lookup index. When referencing these indices in your ESQL queries, ensure you use the full index name as provided, without any alterations or abbreviations.
\`\`\`

`;
