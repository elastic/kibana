/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * Schema for validating pipeline run API request body.
 * Used by `POST /internal/elastic_assistant/attack_discovery/pipeline/_run`.
 */
export const pipelineRunRequestSchema = schema.object({
  spaceId: schema.string({ defaultValue: 'default', minLength: 1, maxLength: 100 }),
  dryRun: schema.boolean({ defaultValue: false }),
  config: schema.maybe(
    schema.object({
      enabled: schema.maybe(schema.boolean()),
      intervalMinutes: schema.maybe(schema.number({ min: 1, max: 1440 })),
      deduplication: schema.maybe(
        schema.object({
          enabled: schema.maybe(schema.boolean()),
          similarityThreshold: schema.maybe(schema.number({ min: 0, max: 1 })),
          maxResults: schema.maybe(schema.number({ min: 1, max: 10000 })),
        })
      ),
      entityExtraction: schema.maybe(
        schema.object({
          enabled: schema.maybe(schema.boolean()),
          exclusionFilters: schema.maybe(
            schema.recordOf(schema.string(), schema.arrayOf(schema.string()))
          ),
        })
      ),
      caseMatching: schema.maybe(
        schema.object({
          enabled: schema.maybe(schema.boolean()),
          strategy: schema.maybe(
            schema.oneOf([
              schema.literal('strict'),
              schema.literal('relaxed'),
              schema.literal('weighted'),
              schema.literal('temporal'),
            ])
          ),
          matchThreshold: schema.maybe(schema.number({ min: 0, max: 1 })),
          weights: schema.maybe(
            schema.object({
              ip: schema.maybe(schema.number({ min: 0, max: 10 })),
              hostname: schema.maybe(schema.number({ min: 0, max: 10 })),
              user: schema.maybe(schema.number({ min: 0, max: 10 })),
              fileHash: schema.maybe(schema.number({ min: 0, max: 10 })),
              domain: schema.maybe(schema.number({ min: 0, max: 10 })),
              process: schema.maybe(schema.number({ min: 0, max: 10 })),
              other: schema.maybe(schema.number({ min: 0, max: 10 })),
            })
          ),
          temporalDecayDays: schema.maybe(schema.number({ min: 1, max: 365 })),
        })
      ),
      incrementalAd: schema.maybe(
        schema.object({
          enabled: schema.maybe(schema.boolean()),
          minNewAlerts: schema.maybe(schema.number({ min: 1, max: 1000 })),
          autoTriggerOnAttachment: schema.maybe(schema.boolean()),
        })
      ),
    })
  ),
});

export type PipelineRunRequest = TypeOf<typeof pipelineRunRequestSchema>;

/**
 * Schema for validating pipeline schedule request body.
 * Used by `POST /internal/elastic_assistant/attack_discovery/pipeline/_schedule`.
 */
export const pipelineScheduleRequestSchema = schema.object({
  spaceId: schema.string({ defaultValue: 'default', minLength: 1, maxLength: 100 }),
  intervalMinutes: schema.number({ min: 1, max: 1440, defaultValue: 15 }),
  config: schema.maybe(
    schema.object({
      enabled: schema.maybe(schema.boolean()),
      intervalMinutes: schema.maybe(schema.number({ min: 1, max: 1440 })),
    })
  ),
});

export type PipelineScheduleRequest = TypeOf<typeof pipelineScheduleRequestSchema>;

/**
 * Validates that an ES alert document has the minimum required fields.
 * Returns true if the alert is structurally valid for pipeline processing.
 */
export const isValidAlertDocument = (doc: Record<string, unknown>): boolean => {
  if (!doc || typeof doc !== 'object') return false;

  const kibana = doc.kibana as Record<string, unknown> | undefined;
  if (!kibana) return false;

  const alert = kibana.alert as Record<string, unknown> | undefined;
  if (!alert) return false;

  const rule = alert.rule as Record<string, unknown> | undefined;
  if (!rule || typeof rule.name !== 'string') return false;

  return true;
};
