/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';

export const SLO_GENERATION_SYSTEM_PROMPT = `You are an expert SRE assistant specializing in Service Level Objectives (SLOs) within Elastic Observability.
Your task is to generate a structured SLO definition from a natural language description.

## SLO Indicator Types

Choose the most appropriate indicator type based on the user's description:

1. **sli.kql.custom** — Custom KQL: Define good and total events using KQL filter queries against any index.
   - Use when the user describes good/bad events using log or event data with query conditions.
   - Requires: index, good (KQL filter for good events), total (KQL filter for all events), timestampField.
   - Optional: filter (additional KQL filter applied to both good and total).

2. **sli.apm.transactionDuration** — APM Latency: Measures the percentage of APM transactions completing within a latency threshold.
   - Use when the user mentions response time, latency, or transaction duration for a service.
   - Requires: service, environment, transactionType, transactionName, threshold (in ms), index.
   - The index MUST always be set. Use "metrics-apm*" as the default for APM indicators.
   - Optional: filter.

3. **sli.apm.transactionErrorRate** — APM Availability: Measures the percentage of successful (non-error) APM transactions.
   - Use when the user mentions error rate, availability, or success rate for a service.
   - Requires: service, environment, transactionType, transactionName, index.
   - The index MUST always be set. Use "metrics-apm*" as the default for APM indicators.
   - Optional: filter.

4. **sli.metric.custom** — Custom Metric: Define good and total using metric aggregations (sum, doc_count).
   - Use when the user describes metrics with aggregation functions against numeric fields.
   - Requires: index, timestampField, good.metrics (array of {name, aggregation, field}), good.equation, total.metrics, total.equation.
   - Optional: filter.

5. **sli.metric.timeslice** — Timeslice Metric: Evaluate a metric equation per timeslice against a threshold.
   - Use when the user wants to measure a metric value per time interval (e.g., avg CPU < 80%).
   - Requires: index, timestampField, metric.metrics (array of {name, aggregation, field}), metric.equation, metric.comparator (GT, GTE, LT, LTE), metric.threshold.
   - Optional: filter.

6. **sli.histogram.custom** — Custom Histogram: Define good and total via range or value_count on histogram fields.
   - Use for histogram-based metrics with range filters.
   - Requires: index, timestampField, good.field, good.aggregation, total.field, total.aggregation.
   - Optional: filter, good.from, good.to, total.from, total.to.

7. **sli.synthetics.availability** — Synthetics Availability: Uptime for synthetic monitors.
   - Use when the user mentions synthetic monitors, uptime checks, or ping tests.
   - Requires: monitorIds (array), tags (array), projects (array).

## Time Windows
- **Rolling**: duration must be "7d", "30d", or "90d". Type is "rolling".
- **Calendar-aligned**: duration must be "1w" or "1M". Type is "calendarAligned".
- Default to 30d rolling if not specified.

## Budgeting Methods
- **occurrences**: Ratio of good events to total events over the time window. This is the default.
- **timeslices**: Percentage of time slices that meet the threshold. Requires timesliceTarget (0-1) and timesliceWindow (e.g., "5m", "1h").

## Objectives
- target: A percentage value between 0 and 100 (e.g., 99 for 99%, 99.9 for 99.9%). Common targets: 95, 99, 99.5, 99.9, 99.99.
- Default to 99 if not specified.

## Settings Defaults
- frequency: "1m" (duration string format: number + unit, e.g. "1m", "5m", "1h")
- syncDelay: "1m" (duration string format: number + unit)
- preventInitialBackfill: false
- syncField: null
- IMPORTANT: syncDelay and frequency MUST be duration strings like "1m", NOT numbers like 1.

## Guidelines
- Choose the simplest indicator type that matches the user's intent.
- For APM services, prefer APM-specific indicators over custom KQL.
- For latency SLOs, use sli.apm.transactionDuration with a reasonable threshold (e.g., 250ms, 500ms, 1000ms).
- For availability SLOs on services, use sli.apm.transactionErrorRate.
- For custom queries on logs or events, use sli.kql.custom.
- For infrastructure metrics (CPU, memory, disk), use sli.metric.timeslice.
- Generate a meaningful name and description for the SLO.
- If the user mentions grouping by host, service, environment, etc., set groupBy to the appropriate field name(s).
- If the user doesn't specify an index, use a sensible default based on the indicator type (e.g., "logs-*" for log-based, "metrics-*" for metric-based).
- For KQL indicators, the timestampField is typically "@timestamp".
- Always provide an explanation of the choices made and why the indicator type was selected.`;

export const SLO_GENERATION_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    sloDefinition: {
      type: 'object',
      description: 'The structured SLO definition matching the CreateSLOForm schema.',
      properties: {
        name: {
          type: 'string',
          description: 'A concise, descriptive name for the SLO.',
        },
        description: {
          type: 'string',
          description: 'A human-readable description explaining what this SLO measures.',
        },
        indicator: {
          type: 'object',
          description:
            'The SLI indicator configuration. The "type" field determines which params are required.',
          properties: {
            type: {
              type: 'string',
              enum: [
                'sli.kql.custom',
                'sli.apm.transactionDuration',
                'sli.apm.transactionErrorRate',
                'sli.metric.custom',
                'sli.metric.timeslice',
                'sli.histogram.custom',
                'sli.synthetics.availability',
              ],
              description: 'The indicator type.',
            },
            params: {
              type: 'object',
              description:
                'Indicator-specific parameters. Structure depends on the indicator type.',
            },
          },
          required: ['type', 'params'],
        },
        timeWindow: {
          type: 'object',
          properties: {
            duration: {
              type: 'string',
              description:
                'Time window duration. Rolling: "7d", "30d", or "90d". Calendar: "1w" or "1M".',
            },
            type: {
              type: 'string',
              enum: ['rolling', 'calendarAligned'],
              description: 'Time window type.',
            },
          },
          required: ['duration', 'type'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorizing the SLO.',
        },
        budgetingMethod: {
          type: 'string',
          enum: ['occurrences', 'timeslices'],
          description: 'The budgeting method.',
        },
        objective: {
          type: 'object',
          properties: {
            target: {
              type: 'number',
              description: 'The SLO target percentage (e.g., 99 for 99%).',
            },
            timesliceTarget: {
              type: 'number',
              description:
                'Required when budgetingMethod is "timeslices". Value between 0 and 1 (e.g., 0.95).',
            },
            timesliceWindow: {
              type: 'string',
              description:
                'Required when budgetingMethod is "timeslices". E.g., "5m", "10m", "1h".',
            },
          },
          required: ['target'],
        },
        groupBy: {
          description: 'Field(s) to group the SLO by, or "*" for no grouping.',
        },
        settings: {
          type: 'object',
          properties: {
            preventInitialBackfill: { type: 'boolean' },
            syncDelay: {
              type: 'string',
              description: 'Sync delay as a duration string, e.g. "1m", "5m".',
            },
            frequency: {
              type: 'string',
              description: 'Evaluation frequency as a duration string, e.g. "1m", "5m".',
            },
            syncField: {
              description: 'Custom timestamp field for sync, or null.',
            },
          },
        },
      },
      required: ['name', 'description', 'indicator', 'timeWindow', 'budgetingMethod', 'objective'],
    },
    explanation: {
      type: 'string',
      description:
        'A brief explanation of the choices made: why this indicator type was chosen, what the queries measure, and any assumptions made.',
    },
  },
  required: ['sloDefinition', 'explanation'],
} satisfies ToolSchema;

export const SLO_DISCOVER_SYSTEM_PROMPT = `You are an expert SRE assistant specializing in Service Level Objectives (SLOs) within Elastic Observability.
Your task is to analyze a user's cluster data and propose user-centric SLOs and SLIs based on the available data sources.

## Your Goal
Given a summary of available data (APM services, synthetics monitors, log data streams, metric indices),
propose concrete, actionable SLOs that follow SRE best practices. Focus on user-facing reliability —
availability, latency, and correctness — not internal infrastructure metrics.

## SLO Indicator Types You Can Use

1. **sli.apm.transactionErrorRate** — APM Availability: Percentage of successful (non-error) transactions.
   - Best for: service availability SLOs.
   - Requires: service, environment, transactionType, transactionName, index.
   - The index field is REQUIRED. Use "metrics-apm*" as the default.

2. **sli.apm.transactionDuration** — APM Latency: Percentage of transactions completing within a threshold.
   - Best for: service latency/performance SLOs.
   - Requires: service, environment, transactionType, transactionName, threshold (in ms), index.
   - The index field is REQUIRED. Use "metrics-apm*" as the default.

3. **sli.synthetics.availability** — Synthetics Availability: Uptime for synthetic monitors.
   - Best for: endpoint/URL uptime SLOs.
   - Requires: monitorIds (array), tags (array), projects (array).

4. **sli.kql.custom** — Custom KQL: Good/total events from any index via KQL queries.
   - Best for: log-based error rate, custom event SLOs.
   - Requires: index, good (KQL), total (KQL), timestampField.

5. **sli.metric.timeslice** — Timeslice Metric: Metric equation per timeslice vs threshold.
   - Best for: infrastructure metrics like CPU, memory, disk usage.
   - Requires: index, timestampField, metric.metrics, metric.equation, metric.comparator, metric.threshold.

## Prioritization Rules
1. **User-facing availability first**: For every APM service, always propose an availability SLO (error rate).
2. **Latency second**: For key services (especially "request" transaction types), propose a latency SLO.
3. **Synthetics monitors**: If monitors exist, propose availability SLOs for them.
4. **Error logs**: If log data exists, propose error-rate SLOs for high-volume log streams.
5. **Infrastructure**: Only propose infrastructure SLOs if they clearly support user-facing reliability.

## Guidelines
- Generate between 1 and 15 SLOs depending on what data is available.
- Use sensible default targets: 99% for availability, 99% for latency (250ms for web, 1000ms for APIs).
- Default time window: 30d rolling.
- Default budgeting method: occurrences.
- Use groupBy when it makes sense (e.g., service.environment for multi-environment services).
- Each SLO must have a meaningful name, clear description, and appropriate tags.
- For APM services, set transactionType to "request" for web services and the appropriate type for others.
- Provide a brief rationale for each proposed SLO.
- Tag each SLO with "auto-discovered" plus relevant domain tags.
- IMPORTANT: All duration values (syncDelay, frequency, timesliceWindow, timeWindow.duration) MUST be strings in the format "<number><unit>" e.g. "1m", "5m", "30d", "7d". Never use bare numbers.
- Do NOT include a "settings" field unless you need to override the defaults. If omitted, defaults will be applied automatically.`;

export const SLO_DISCOVER_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    proposedSlos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sloDefinition: {
            type: 'object',
            description: 'The structured SLO definition matching the CreateSLOForm schema.',
            properties: {
              name: { type: 'string', description: 'A concise, descriptive name for the SLO.' },
              description: {
                type: 'string',
                description: 'A human-readable description explaining what this SLO measures.',
              },
              indicator: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'sli.kql.custom',
                      'sli.apm.transactionDuration',
                      'sli.apm.transactionErrorRate',
                      'sli.metric.custom',
                      'sli.metric.timeslice',
                      'sli.histogram.custom',
                      'sli.synthetics.availability',
                    ],
                  },
                  params: { type: 'object' },
                },
                required: ['type', 'params'],
              },
              timeWindow: {
                type: 'object',
                properties: {
                  duration: { type: 'string' },
                  type: { type: 'string', enum: ['rolling', 'calendarAligned'] },
                },
                required: ['duration', 'type'],
              },
              tags: { type: 'array', items: { type: 'string' } },
              budgetingMethod: {
                type: 'string',
                enum: ['occurrences', 'timeslices'],
              },
              objective: {
                type: 'object',
                properties: {
                  target: { type: 'number' },
                  timesliceTarget: { type: 'number' },
                  timesliceWindow: { type: 'string' },
                },
                required: ['target'],
              },
              groupBy: { description: 'Field(s) to group the SLO by, or "*" for no grouping.' },
              settings: {
                type: 'object',
                properties: {
                  preventInitialBackfill: { type: 'boolean' },
                  syncDelay: {
                    type: 'string',
                    description: 'Duration string, e.g. "1m".',
                  },
                  frequency: {
                    type: 'string',
                    description: 'Duration string, e.g. "1m".',
                  },
                  syncField: { description: 'Custom timestamp field or null.' },
                },
              },
            },
            required: [
              'name',
              'description',
              'indicator',
              'timeWindow',
              'budgetingMethod',
              'objective',
            ],
          },
          rationale: {
            type: 'string',
            description:
              'Brief explanation of why this SLO was proposed and what user-facing impact it monitors.',
          },
          category: {
            type: 'string',
            enum: ['availability', 'latency', 'correctness', 'uptime', 'throughput'],
            description: 'The category of reliability this SLO measures.',
          },
          priority: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low'],
            description:
              'How important this SLO is for user-facing reliability. Critical = directly impacts users.',
          },
        },
        required: ['sloDefinition', 'rationale', 'category', 'priority'],
      },
      description: 'Array of proposed SLO definitions with rationale.',
    },
    summary: {
      type: 'string',
      description:
        'A brief overview of the cluster data analyzed and the reasoning behind the proposed SLOs.',
    },
  },
  required: ['proposedSlos', 'summary'],
} satisfies ToolSchema;

export const SLO_SUGGEST_SYSTEM_PROMPT = `You are an expert SRE assistant specializing in Service Level Objectives (SLOs).
Your task is to analyze an SLO definition and suggest improvements or enhancements.

Consider the following when making suggestions:
- Is the objective target appropriate for the use case? Common targets are 99%, 99.5%, 99.9%.
- Would a different time window better suit the use case?
- Could groupBy be used to create per-service or per-host SLOs?
- Would timeslice budgeting be more appropriate than occurrences for this type of metric?
- Are the KQL queries or metric definitions optimal?
- Are there missing tags that would help organize this SLO?
- Could the SLO description be more informative?
- Is the indicator type the best fit for what the user is trying to measure?

Provide actionable, specific suggestions. Each suggestion should explain WHY the change would improve the SLO.`;

export const SLO_SUGGEST_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'A short title for the suggestion.',
          },
          description: {
            type: 'string',
            description:
              'A detailed explanation of the suggestion and why it would improve the SLO.',
          },
          field: {
            type: 'string',
            description:
              'The SLO field this suggestion applies to (e.g., "objective.target", "groupBy", "budgetingMethod").',
          },
          suggestedValue: {
            description: 'The suggested new value for the field, if applicable.',
          },
        },
        required: ['title', 'description'],
      },
      description: 'Array of improvement suggestions for the SLO definition.',
    },
  },
  required: ['suggestions'],
} satisfies ToolSchema;
