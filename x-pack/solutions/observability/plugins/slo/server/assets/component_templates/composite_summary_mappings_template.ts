/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  COMPOSITE_SLO_RESOURCES_VERSION,
} from '../../../common/constants';

export const COMPOSITE_SUMMARY_MAPPINGS_TEMPLATE: ClusterPutComponentTemplateRequest = {
  name: COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  template: {
    mappings: {
      dynamic: false,
      properties: {
        spaceId: { type: 'keyword' },
        summaryUpdatedAt: {
          type: 'date',
          format: 'date_optional_time||epoch_millis',
        },
        compositeSlo: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            description: { type: 'text' },
            tags: { type: 'keyword' },
            objective: {
              properties: {
                target: { type: 'double' },
              },
            },
            timeWindow: {
              properties: {
                duration: { type: 'keyword' },
                type: { type: 'keyword' },
              },
            },
            budgetingMethod: { type: 'keyword' },
            createdAt: {
              type: 'date',
              format: 'date_optional_time||epoch_millis',
            },
            updatedAt: {
              type: 'date',
              format: 'date_optional_time||epoch_millis',
            },
          },
        },
        sliValue: { type: 'double' },
        status: { type: 'keyword' },
        errorBudgetInitial: { type: 'double' },
        errorBudgetConsumed: { type: 'double' },
        errorBudgetRemaining: { type: 'double' },
        errorBudgetIsEstimated: { type: 'boolean' },
        fiveMinuteBurnRate: { type: 'double' },
        oneHourBurnRate: { type: 'double' },
        oneDayBurnRate: { type: 'double' },
        unresolvedMemberIds: { type: 'keyword' },
        members: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            weight: { type: 'double' },
            normalisedWeight: { type: 'double' },
            sliValue: { type: 'double' },
            contribution: { type: 'double' },
            status: { type: 'keyword' },
            instanceId: { type: 'keyword' },
          },
        },
      },
    },
  },
  _meta: {
    description: 'SLO composite summary mappings template',
    version: COMPOSITE_SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
};
