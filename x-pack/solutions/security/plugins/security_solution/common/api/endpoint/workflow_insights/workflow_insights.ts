/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const arrayWithNonEmptyString = (field: string, options: { maxSize: number }) =>
  schema.arrayOf(
    schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return `${field} cannot be an empty string`;
        }
      },
    }),
    options
  );

export const UpdateWorkflowInsightRequestSchema = {
  params: schema.object({
    insightId: schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return 'insightId cannot be an empty string';
        }
      },
    }),
  }),
  body: schema.object({
    '@timestamp': schema.maybe(schema.string()),
    message: schema.maybe(schema.string()),
    category: schema.maybe(schema.oneOf([schema.literal('endpoint')])),
    type: schema.maybe(
      schema.oneOf([
        schema.literal('incompatible_antivirus'),
        schema.literal('policy_response_failure'),
        schema.literal('noisy_process_tree'),
      ])
    ),
    source: schema.maybe(
      schema.object({
        type: schema.maybe(schema.oneOf([schema.literal('llm-connector')])),
        id: schema.maybe(schema.string()),
        data_range_start: schema.maybe(schema.string()),
        data_range_end: schema.maybe(schema.string()),
      })
    ),
    target: schema.maybe(
      schema.object({
        type: schema.maybe(schema.oneOf([schema.literal('endpoint')])),
        ids: schema.maybe(arrayWithNonEmptyString('target.id', { maxSize: 50 })),
      })
    ),
    action: schema.maybe(
      schema.object({
        type: schema.maybe(
          schema.oneOf([
            schema.literal('refreshed'),
            schema.literal('remediated'),
            schema.literal('suppressed'),
            schema.literal('dismissed'),
          ])
        ),
        timestamp: schema.maybe(schema.string()),
      })
    ),
    value: schema.maybe(schema.string()),
    remediation: schema.maybe(
      schema.object({
        exception_list_items: schema.maybe(
          schema.arrayOf(
            schema.object({
              list_id: schema.maybe(schema.string()),
              name: schema.maybe(schema.string()),
              description: schema.maybe(schema.string()),
              entries: schema.maybe(schema.arrayOf(schema.any(), { maxSize: 250 })),
              tags: schema.maybe(arrayWithNonEmptyString('tag', { maxSize: 50 })),
              os_types: schema.maybe(arrayWithNonEmptyString('os_type', { maxSize: 20 })),
            }),
            { maxSize: 100 }
          )
        ),
        descriptive: schema.maybe(schema.string()),
        link: schema.maybe(schema.string()),
      })
    ),
    metadata: schema.maybe(
      schema.object({
        notes: schema.maybe(schema.recordOf(schema.string(), schema.string())),
        message_variables: schema.maybe(
          arrayWithNonEmptyString('message_variable', { maxSize: 50 })
        ),
      })
    ),
  }),
};

export const GetWorkflowInsightsRequestSchema = {
  query: schema.object({
    size: schema.maybe(schema.number()),
    from: schema.maybe(schema.number()),
    ids: schema.maybe(arrayWithNonEmptyString('ids', { maxSize: 50 })),
    categories: schema.maybe(
      schema.arrayOf(schema.oneOf([schema.literal('endpoint')]), { maxSize: 20 })
    ),
    types: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('incompatible_antivirus'),
          schema.literal('policy_response_failure'),
          schema.literal('noisy_process_tree'),
        ]),
        { maxSize: 20 }
      )
    ),
    sourceTypes: schema.maybe(
      schema.arrayOf(schema.oneOf([schema.literal('llm-connector')]), { maxSize: 20 })
    ),
    sourceIds: schema.maybe(arrayWithNonEmptyString('sourceId', { maxSize: 50 })),
    targetTypes: schema.maybe(
      schema.arrayOf(schema.oneOf([schema.literal('endpoint')]), { maxSize: 20 })
    ),
    targetIds: schema.maybe(arrayWithNonEmptyString('targetId', { maxSize: 50 })),
    actionTypes: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          schema.literal('refreshed'),
          schema.literal('remediated'),
          schema.literal('suppressed'),
          schema.literal('dismissed'),
        ]),
        { maxSize: 20 }
      )
    ),
  }),
};

export type GetWorkflowInsightsRequestQueryParams = TypeOf<
  typeof GetWorkflowInsightsRequestSchema.query
>;

export type UpdateWorkflowInsightsRequestParams = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.params
>;
export type UpdateWorkflowInsightsRequestBody = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.body
>;
