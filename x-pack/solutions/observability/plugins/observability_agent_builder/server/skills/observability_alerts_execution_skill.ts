/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';
import { createToolProxy } from './utils/create_tool_proxy';

export const OBSERVABILITY_ALERTS_EXECUTION_SKILL: Skill = {
    namespace: 'observability.alerts_execution',
    name: 'Observability Alerts (Execution)',
    description: 'Execute read-only alert retrieval tools for Observability',
    content: `# Observability Alerts (Execution)

## What this skill does
Provides concrete, read-only tooling guidance for fetching Observability alerts.

## Tools
- Use \`${internalNamespaces.observability}.get_alerts\` for retrieving alerts.\n

## Notes
- This skill is read-only.\n
`,
    tools: [createToolProxy({ toolId: `${internalNamespaces.observability}.get_alerts` })],
};



