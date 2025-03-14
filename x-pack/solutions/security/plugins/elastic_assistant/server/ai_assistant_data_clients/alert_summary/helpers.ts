/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  AlertSummaryCreateProps,
  AlertSummaryResponse,
  AlertSummaryUpdateProps,
} from '@kbn/elastic-assistant-common/impl/schemas/alert_summary/bulk_crud_alert_summary_route.gen';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { CreateAlertSummarySchema, EsAlertSummarySchema, UpdateAlertSummarySchema } from './types';

export const transformESToAlertSummary = (
  response: EsAlertSummarySchema[]
): AlertSummaryResponse[] => {
  return response.map((alertSummarySchema) => {
    const alertSummary: AlertSummaryResponse = {
      timestamp: alertSummarySchema['@timestamp'],
      createdAt: alertSummarySchema.created_at,
      users:
        alertSummarySchema.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],
      summary: alertSummarySchema.summary,
      alertId: alertSummarySchema.alert_id,
      updatedAt: alertSummarySchema.updated_at,
      namespace: alertSummarySchema.namespace,
      id: alertSummarySchema.id,
      createdBy: alertSummarySchema.created_by,
      updatedBy: alertSummarySchema.updated_by,
    };

    return alertSummary;
  });
};

export const transformESSearchToAlertSummary = (
  response: estypes.SearchResponse<EsAlertSummarySchema>
): AlertSummaryResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const alertSummarySchema = hit._source!;
      const alertSummary: AlertSummaryResponse = {
        timestamp: alertSummarySchema['@timestamp'],
        createdAt: alertSummarySchema.created_at,
        users:
          alertSummarySchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        summary: alertSummarySchema.summary,
        updatedAt: alertSummarySchema.updated_at,
        namespace: alertSummarySchema.namespace,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
        alertId: alertSummarySchema.alert_id,
        createdBy: alertSummarySchema.created_by,
        updatedBy: alertSummarySchema.updated_by,
      };

      return alertSummary;
    });
};

export const transformToUpdateScheme = (
  user: AuthenticatedUser,
  updatedAt: string,
  { summary, id }: AlertSummaryUpdateProps
): UpdateAlertSummarySchema => {
  return {
    id,
    updated_at: updatedAt,
    summary: summary ?? '',
    users: [
      {
        id: user.profile_uid,
        name: user.username,
      },
    ],
  };
};

export const transformToCreateScheme = (
  user: AuthenticatedUser,
  updatedAt: string,
  { summary, alertId }: AlertSummaryCreateProps
): CreateAlertSummarySchema => {
  return {
    '@timestamp': updatedAt,
    updated_at: updatedAt,
    updated_by: user.username,
    created_at: updatedAt,
    created_by: user.username,
    summary: summary ?? '',
    alert_id: alertId,
    users: [
      {
        id: user.profile_uid,
        name: user.username,
      },
    ],
  };
};

export const getUpdateScript = ({
  alertSummary,
  isPatch,
}: {
  alertSummary: UpdateAlertSummarySchema;
  isPatch?: boolean;
}) => {
  return {
    script: {
      source: `
    if (params.assignEmpty == true || params.containsKey('summary')) {
      ctx._source.summary = params.summary;
    }
    ctx._source.updated_at = params.updated_at;
  `,
      lang: 'painless',
      params: {
        ...alertSummary, // when assigning undefined in painless, it will remove property and wil set it to null
        // for patch we don't want to remove unspecified value in payload
        assignEmpty: !(isPatch ?? true),
      },
    },
  };
};
