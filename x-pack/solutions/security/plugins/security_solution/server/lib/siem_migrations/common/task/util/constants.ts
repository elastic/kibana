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
1. Do not output dummy query or sample query. Output a query ONLY and ONLY IF at least 50% of query's logic can be translated.
2. Do not use quotes for variables or aliases, replace any in the original with snake cased aliases. Only use quotes when necessary as a string literal.
3. Never add quotes or ticks to index names.
4. Whenever you are asked to search in Event payload, source payload and no specific field is specified, ALWAYS do the search with the help of KQL or QSTR command. For example, if instruction is search for "malware*" in event payload when use KQL command like so: \`where kql\("malware*"\)\`.

\`\`\`

`;
