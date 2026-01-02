/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Shared Entity Linking prompt section for Observability Agent Builder.
 * This prompt instructs the LLM to format entities (services, traces, errors) as clickable links
 * using Kibana's relative URL paths.
 *
 * This should be included in:
 * - System prompts for all AI insight attachment types (logs, alerts, errors)
 * - Observability agent instructions
 */
export const ENTITY_LINKING_PROMPT = dedent(`
  ## Formatting Guidelines

  Use markdown for readability. When referencing entities, create clickable links:

  | Entity | Link Format |
  |--------|-------------|
  | Service | \`[service-name](/app/apm/services/service-name)\` |
  | Trace | \`[trace-id](/app/apm/link-to/trace/trace-id)\` |
  | Error | \`[error-key](/app/apm/services/service-name/errors/error-key)\` |

  **Examples:**
  - "The [billing-service](/app/apm/services/billing-service) is experiencing high latency."
  - "See trace [8a3c42](/app/apm/link-to/trace/8a3c42) for the full request flow."
  - "Error [abcde](/app/apm/services/frontend/errors/abcde) in [frontend](/app/apm/services/frontend)."
`);
