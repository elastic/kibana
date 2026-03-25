/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf, type Type } from '@kbn/config-schema';

import {
  WORKFLOW_INSIGHT_TYPE_VALUES,
  WORKFLOW_INSIGHT_CATEGORY_VALUES,
  WORKFLOW_INSIGHT_SOURCE_TYPE_VALUES,
  WORKFLOW_INSIGHT_TARGET_TYPE_VALUES,
  WORKFLOW_INSIGHT_ACTION_TYPE_VALUES,
} from '../../../endpoint/types/workflow_insights';

const arrayWithNonEmptyString = (field: string) =>
  schema.arrayOf(
    schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return `${field} cannot be an empty string`;
        }
      },
    })
  );

const schemaOneOfValues = (values: readonly string[]) =>
  schema.oneOf(values.map((v) => schema.literal(v)) as [Type<string>]);

const insightTypeOneOf = schemaOneOfValues(WORKFLOW_INSIGHT_TYPE_VALUES);
const categoryOneOf = schemaOneOfValues(WORKFLOW_INSIGHT_CATEGORY_VALUES);
const sourceTypeOneOf = schemaOneOfValues(WORKFLOW_INSIGHT_SOURCE_TYPE_VALUES);
const targetTypeOneOf = schemaOneOfValues(WORKFLOW_INSIGHT_TARGET_TYPE_VALUES);
const actionTypeOneOf = schemaOneOfValues(WORKFLOW_INSIGHT_ACTION_TYPE_VALUES);

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
    category: schema.maybe(categoryOneOf),
    type: schema.maybe(insightTypeOneOf),
    source: schema.maybe(
      schema.object({
        type: schema.maybe(sourceTypeOneOf),
        id: schema.maybe(schema.string()),
        data_range_start: schema.maybe(schema.string()),
        data_range_end: schema.maybe(schema.string()),
      })
    ),
    target: schema.maybe(
      schema.object({
        type: schema.maybe(targetTypeOneOf),
        ids: schema.maybe(arrayWithNonEmptyString('target.id')),
      })
    ),
    action: schema.maybe(
      schema.object({
        type: schema.maybe(actionTypeOneOf),
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
              entries: schema.maybe(schema.arrayOf(schema.any())),
              tags: schema.maybe(arrayWithNonEmptyString('tag')),
              os_types: schema.maybe(arrayWithNonEmptyString('os_type')),
            })
          )
        ),
        descriptive: schema.maybe(schema.string()),
        link: schema.maybe(schema.string()),
      })
    ),
    metadata: schema.maybe(
      schema.object({
        notes: schema.maybe(schema.recordOf(schema.string(), schema.string())),
        message_variables: schema.maybe(arrayWithNonEmptyString('message_variable')),
      })
    ),
  }),
};

export const GetWorkflowInsightsRequestSchema = {
  query: schema.object({
    size: schema.maybe(schema.number()),
    from: schema.maybe(schema.number()),
    ids: schema.maybe(arrayWithNonEmptyString('ids')),
    categories: schema.maybe(schema.arrayOf(categoryOneOf, { maxSize: 20 })),
    types: schema.maybe(schema.arrayOf(insightTypeOneOf, { maxSize: 20 })),
    sourceTypes: schema.maybe(schema.arrayOf(sourceTypeOneOf, { maxSize: 20 })),
    sourceIds: schema.maybe(arrayWithNonEmptyString('sourceId')),
    targetTypes: schema.maybe(schema.arrayOf(targetTypeOneOf, { maxSize: 20 })),
    targetIds: schema.maybe(arrayWithNonEmptyString('targetId')),
    actionTypes: schema.maybe(schema.arrayOf(actionTypeOneOf, { maxSize: 20 })),
  }),
};

export const CreateWorkflowInsightRequestSchema = {
  body: schema.object({
    insightType: insightTypeOneOf,
  }),
};

export const GetPendingInsightsRequestSchema = {
  query: schema.object({
    insightType: schema.maybe(insightTypeOneOf),
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

export type GetPendingInsightsRequestQueryParams = TypeOf<
  typeof GetPendingInsightsRequestSchema.query
>;
