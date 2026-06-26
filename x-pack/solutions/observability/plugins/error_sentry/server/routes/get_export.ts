/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdmZip = require('adm-zip');
import type { IRouter } from '@kbn/core/server';
import { getManagedWorkflowDefinitions } from '@kbn/workflows/managed';
import { detectiveRalphCreateRequest, SCS_TOOL_IDS } from '../agent/detective_ralph';

// ── Filename map: workflow id → export filename ──────────────────────────────

const WORKFLOW_FILENAMES: Record<string, string> = {
  'system-error-sentry-capture': 'capture-log-error-patterns.yaml',
  'system-error-sentry-escalate-github': 'escalate-to-github.yaml',
  'system-error-sentry-ask-ralph': 'ask-detective-ralph.yaml',
  'system-error-sentry-introspect': 'introspect-log-configuration.yaml',
  'system-error-sentry-ralph-investigation': 'detective-ralph-investigation.yaml',
};

// ── Step YAML documentation ───────────────────────────────────────────────────

const COLLECT_LOG_PATTERNS_YAML = `\
id: error-sentry.collectLogPatterns
label: Collect log patterns
category: elasticsearch
description: >
  Runs a categorize_text aggregation over a log index to surface the most
  frequent error patterns. Each pattern is assigned a hash-based ID, a severity
  bucket based on document count, and a representative sample message.

inputs:
  index:
    type: string
    default: "logs.otel"
    description: Index or data stream to scan.
  categoryField:
    type: string
    default: "body.text"
    description: Text-type field used for categorize_text aggregation.
  lookbackDays:
    type: integer
    default: 7
    description: How many days back to look for log documents.
  logLevels:
    type: array<string>
    default: []
    description: >
      If non-empty, only documents whose severity field matches one of these
      values (case-insensitive) are included.
  timestampField:
    type: string
    default: "@timestamp"
    description: Field used to filter by time range.
  minDocCount:
    type: integer
    default: 10
    description: Minimum document count for a pattern to be included.
  size:
    type: integer
    default: 20
    description: Maximum number of patterns to return.

outputs:
  total:
    type: number
    description: Total documents in the lookback window.
  patterns:
    type: array
    description: Top error patterns by frequency.
    items:
      key:
        type: string
        description: Human-readable pattern label from categorize_text.
      hash:
        type: string
        description: 12-character SHA-256 hex fingerprint of the pattern key.
      docCount:
        type: number
        description: Number of documents matching this pattern.
      severity:
        type: string
        enum: [critical, high, medium, low]
        description: >
          Severity bucket — critical (>=10 000 docs), high (>=1 000),
          medium (>=100), low (< 100).
      sampleMessage:
        type: string
        description: A representative log message for this pattern.
`;

const INTROSPECT_LOGS_YAML = `\
id: error-sentry.introspectLogs
label: Introspect log configuration
category: elasticsearch
description: >
  Probes candidate log indices for recent data, inspects mappings for the best
  text-type category field, determines the severity detection strategy via ESQL
  field-coverage counts, samples a recent document for Kubernetes attribute keys,
  and writes the full enriched configuration to Elasticsearch.

inputs:
  candidateIndexPatterns:
    type: array<string>
    default: ["logs.otel", "logs-*", "filebeat-*", "logstash-*"]
    description: Log index patterns to probe, in priority order.
  preferredCategoryFields:
    type: array<string>
    default: ["body.text", "message", "log.message", "event.original"]
    description: Text-type fields to prefer for categorize_text, in priority order.
  lookbackDays:
    type: integer
    default: 7
    description: Recency window (days) used to check whether an index has recent data.
  configIndex:
    type: string
    default: ".error-sentry-config"
    description: Elasticsearch index used to persist the discovered configuration.
  configDocId:
    type: string
    default: "capture-config"
    description: Document ID of the configuration document.

outputs:
  index:
    type: string
    description: The chosen log index or pattern.
  categoryField:
    type: string
    description: The chosen field for categorize_text.
  docsCount:
    type: number
    description: Recent log document count in the chosen index.
  severityStrategy:
    type: string
    enum: [severity, text]
    description: >
      "severity" filters by severity field values;
      "text" uses full-text keyword matching.
  severityField:
    type: string
    optional: true
    description: Severity field name when strategy is "severity" (e.g. log.level).
  logLevels:
    type: array<string>
    description: Log level values to filter on when strategy is "severity".
  textFilter:
    type: string
    optional: true
    description: Full-text query string used when strategy is "text".
  k8s:
    type: object
    optional: true
    description: Kubernetes attribute keys detected in a sampled document.
    properties:
      podKey: { type: string, optional: true }
      namespaceKey: { type: string, optional: true }
      deploymentKey: { type: string, optional: true }
      hostKey: { type: string, optional: true }
      serviceKey: { type: string, optional: true }
  totalDocs7d:
    type: number
    description: Total documents in the chosen index during the lookback window.
  errorMatchingDocs7d:
    type: number
    description: Documents matching the error vocabulary query in the lookback window.
`;

const STEP_DOCS: Record<string, string> = {
  'error-sentry.collectLogPatterns': COLLECT_LOG_PATTERNS_YAML,
  'error-sentry.introspectLogs': INTROSPECT_LOGS_YAML,
};

// ── Workflow YAML annotation ──────────────────────────────────────────────────

const annotateWorkflowYaml = (workflowYaml: string): string =>
  workflowYaml
    .split('\n')
    .flatMap((line) => {
      const match = line.match(/^(\s+)type:\s+(error-sentry\.\w+)/);
      if (!match) return [line];
      const [, indent, stepId] = match;
      const doc = STEP_DOCS[stepId];
      if (!doc) return [line];
      const divider = `${indent}# ${'─'.repeat(72)}`;
      const commentLines = doc.split('\n').map((l) => `${indent}# ${l}`);
      return [`${indent}# Custom step: ${stepId}`, divider, ...commentLines, divider, line];
    })
    .join('\n');

// ── Agent YAML ────────────────────────────────────────────────────────────────

const buildAgentYaml = (): string => {
  const { id, name, description, labels, avatar_icon, configuration } = detectiveRalphCreateRequest;
  const toolIdsYaml = SCS_TOOL_IDS.map((t) => `        - ${t}`).join('\n');
  const instructionsYaml = (configuration.instructions ?? '')
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
  const labelsYaml = (labels ?? []).map((l) => `  - ${l}`).join('\n');

  return `\
# Detective Ralph — AI Agent Definition
# Import into Elastic Agent Builder to recreate this agent.

id: ${id}
name: ${name}
description: >
  ${description}
labels:
${labelsYaml}
avatar_icon: ${avatar_icon}
configuration:
  tools:
    - tool_ids:
${toolIdsYaml}
  instructions: |
${instructionsYaml}
`;
};

// ── README ────────────────────────────────────────────────────────────────────

const README = `\
# Error Sentry — Export

## Contents

| Path | Description |
|------|-------------|
| steps/error-sentry.collectLogPatterns.yaml | Custom step: collect log error patterns |
| steps/error-sentry.introspectLogs.yaml     | Custom step: introspect log configuration |
| workflows/capture-log-error-patterns.yaml  | Scheduled: detect errors and create cases |
| workflows/escalate-to-github.yaml          | Triggered: mirror a case as a GitHub issue |
| workflows/ask-detective-ralph.yaml         | Triggered: answer follow-up questions |
| workflows/introspect-log-configuration.yaml| On-demand: detect log source configuration |
| workflows/detective-ralph-investigation.yaml | Triggered: initial AI investigation |
| agents/detective-ralph.yaml                | Detective Ralph AI agent definition |

## Custom step types

\`error-sentry.collectLogPatterns\` and \`error-sentry.introspectLogs\` are implemented
by the Error Sentry Kibana plugin (\`errorSentry\`). Their full schema is in the
\`steps/\` folder and is also inlined as comments inside the workflow files that use them.

## Importing

1. Install the Error Sentry plugin so the custom step types are registered.
2. Import workflows via **Stack Management → Workflows → Import**.
3. Create the Detective Ralph agent via **Stack Management → AI Assistants → Import**.
`;

// ── Route ─────────────────────────────────────────────────────────────────────

export const registerGetExportRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/error_sentry/export',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    (_context, _request, response) => {
      const errorSentryWorkflows = getManagedWorkflowDefinitions().filter(
        (d) => d.pluginId === 'errorSentry' && d.yaml
      );

      const zip = new AdmZip();

      zip.addFile('README.md', Buffer.from(README, 'utf8'));

      for (const [stepId, stepYaml] of Object.entries(STEP_DOCS)) {
        zip.addFile(`steps/${stepId}.yaml`, Buffer.from(stepYaml, 'utf8'));
      }

      for (const workflow of errorSentryWorkflows) {
        const filename = WORKFLOW_FILENAMES[workflow.id] ?? `${workflow.id}.yaml`;
        zip.addFile(
          `workflows/${filename}`,
          Buffer.from(annotateWorkflowYaml(workflow.yaml!), 'utf8')
        );
      }

      zip.addFile('agents/detective-ralph.yaml', Buffer.from(buildAgentYaml(), 'utf8'));

      const buffer: Buffer = zip.toBuffer();

      return response.ok({
        body: buffer,
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="error-sentry-export.zip"',
        },
      });
    }
  );
};
