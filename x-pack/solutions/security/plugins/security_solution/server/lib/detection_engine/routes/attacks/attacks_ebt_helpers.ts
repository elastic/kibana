/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpResponsePayload, IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  ATTACKS_API_CALL_EVENT,
  type AttacksApiCallOperation,
} from '../../../telemetry/event_based/events';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { buildSiemResponse } from '../utils';

/**
 * EBT helpers for the public Attacks API. API-call telemetry follows the
 * watchlist / entity-store pattern (counts and flags, no PII). Status insights
 * follow the legacy signals status route pattern in open_close_signals_route.ts.
 */

/** Static validation error codes for EBT — never include user-controlled strings. */
export const ATTACKS_DUPLICATE_TAGS_VALIDATION_ERROR = 'duplicate_tags';
export const ATTACKS_DUPLICATE_ASSIGNEES_VALIDATION_ERROR = 'duplicate_assignees';
export const ATTACKS_INVALID_CLOSING_REASON_ERROR = 'invalid_closing_reason';

export interface AttacksApiCallEventFields {
  endpoint: string;
  operation: AttacksApiCallOperation;
  ids_count?: number;
  update_related_alerts?: boolean;
  tags_to_add_count?: number;
  tags_to_remove_count?: number;
  assignees_to_add_count?: number;
  assignees_to_remove_count?: number;
  status?: string;
  has_aggregations?: boolean;
  has_ids_filter?: boolean;
}

interface AttacksSearchRequestBodyForTelemetry {
  query?: unknown;
  aggs?: unknown;
}

const hasIdsQueryFilter = (query: unknown): boolean => {
  if (query == null || typeof query !== 'object') {
    return false;
  }

  const ids = (query as { ids?: { values?: unknown } }).ids;
  return ids != null && ids.values != null;
};

interface AttacksTagsRequestBodyForTelemetry {
  ids: string[];
  tags: {
    tags_to_add?: string[];
    tags_to_remove?: string[];
  };
  update_related_alerts?: boolean;
}

interface AttacksAssigneesRequestBodyForTelemetry {
  ids: string[];
  assignees: {
    add?: string[];
    remove?: string[];
  };
  update_related_alerts?: boolean;
}

interface AttacksStatusRequestBodyForTelemetry {
  ids: string[];
  status: string;
  update_related_alerts?: boolean;
}

export const buildAttacksSearchApiCallFields = (
  endpoint: string,
  body: AttacksSearchRequestBodyForTelemetry
): AttacksApiCallEventFields => ({
  endpoint,
  operation: 'search',
  has_aggregations:
    body.aggs != null && typeof body.aggs === 'object' && Object.keys(body.aggs).length > 0,
  has_ids_filter: hasIdsQueryFilter(body.query),
});

export const buildAttacksTagsApiCallFields = (
  endpoint: string,
  body: AttacksTagsRequestBodyForTelemetry
): AttacksApiCallEventFields => ({
  endpoint,
  operation: 'tags',
  ids_count: body.ids.length,
  update_related_alerts: body.update_related_alerts ?? false,
  tags_to_add_count: body.tags.tags_to_add?.length ?? 0,
  tags_to_remove_count: body.tags.tags_to_remove?.length ?? 0,
});

export const buildAttacksAssigneesApiCallFields = (
  endpoint: string,
  body: AttacksAssigneesRequestBodyForTelemetry
): AttacksApiCallEventFields => ({
  endpoint,
  operation: 'assignees',
  ids_count: body.ids.length,
  update_related_alerts: body.update_related_alerts ?? false,
  assignees_to_add_count: body.assignees.add?.length ?? 0,
  assignees_to_remove_count: body.assignees.remove?.length ?? 0,
});

export const buildAttacksStatusApiCallFields = (
  endpoint: string,
  body: AttacksStatusRequestBodyForTelemetry
): AttacksApiCallEventFields => ({
  endpoint,
  operation: 'status',
  ids_count: body.ids.length,
  update_related_alerts: body.update_related_alerts ?? false,
  status: body.status,
});

export const reportAttacksApiCallSuccess = (
  sender: ITelemetryEventsSender,
  fields: AttacksApiCallEventFields
): void => {
  sender.reportEBT(ATTACKS_API_CALL_EVENT, fields);
};

export const reportAttacksApiCallError = (
  sender: ITelemetryEventsSender,
  fields: AttacksApiCallEventFields,
  errorMessage: string
): void => {
  sender.reportEBT(ATTACKS_API_CALL_EVENT, { ...fields, error: errorMessage });
};

export const withSiemErrorHandlingAndAttacksTelemetry = async <T extends HttpResponsePayload>(
  response: KibanaResponseFactory,
  sender: ITelemetryEventsSender,
  fields: AttacksApiCallEventFields,
  operation: () => Promise<T>
): Promise<IKibanaResponse> => {
  try {
    const body = await operation();
    reportAttacksApiCallSuccess(sender, fields);
    return response.ok({ body });
  } catch (err) {
    const error = transformError(err);
    reportAttacksApiCallError(sender, fields, error.message);
    return buildSiemResponse(response).error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
