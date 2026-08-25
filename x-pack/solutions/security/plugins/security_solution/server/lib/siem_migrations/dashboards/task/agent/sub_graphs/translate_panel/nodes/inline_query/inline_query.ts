/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getInlineSplQuery,
  type GetInlineSplQueryParams,
  getSPLQueryKeywords,
  SPL_KEYWORDS,
} from '../../../../../../../common/task/agent/helpers/inline_spl_query';
import type { GraphNode } from '../../types';
import type { DashboardMigrationTelemetryClient } from '../../../../../dashboard_migrations_telemetry_client';

interface InlineQueryNodeParams extends GetInlineSplQueryParams {
  telemetryClient: DashboardMigrationTelemetryClient;
}

export const getInlineQueryNode = (params: InlineQueryNodeParams): GraphNode => {
  const { telemetryClient, ...inlineParams } = params;
  const inlineSplQuery = getInlineSplQuery(inlineParams);
  return async (state) => {
    // NOTE: "inputlookup" is not currently supported, to make it supported we need to parametrize the unsupported check logic here, and the Splunk lookups identifier.
    const { inlineQuery, isUnsupported, comments } = await inlineSplQuery({
      query: state.parsed_panel.query,
      resources: state.resources,
    });
    if (isUnsupported) {
      // Graph conditional edge detects undefined inline_query as unsupported query
      return { inline_query: undefined, comments };
    }
    const finalInlineQuery = inlineQuery ?? state.parsed_panel.query;
    if (finalInlineQuery) {
      telemetryClient.reportSourceQueryKeywords({
        type: 'dashboards',
        keywords: getSPLQueryKeywords(finalInlineQuery, SPL_KEYWORDS),
      });
    }
    return {
      inline_query: finalInlineQuery,
      comments,
    };
  };
};
