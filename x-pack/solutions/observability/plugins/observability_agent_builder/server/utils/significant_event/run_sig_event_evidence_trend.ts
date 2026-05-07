/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom, notFound } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server/types';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import dedent from 'dedent';
import {
  isErrorResult,
  isVisualizationResult,
  SupportedChartType,
  type ToolResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import { getSignificantEventByEventId } from '../get_significant_event_by_event_id';
import { resolveConnectorForFeature } from '../resolve_connector_for_feature';
import { OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID } from '../../../common/constants';
import type { SigEventEvidenceTrendBody } from './sig_event_evidence_types';

export type SigEventEvidenceTrendApiBody = SigEventEvidenceTrendBody;

interface EvidenceSource {
  readonly esql_query: string;
  readonly result: string;
  readonly rule_name: string;
  readonly description?: string;
  readonly stream_name?: string;
}

function findEvidence(
  evidences: ReadonlyArray<EvidenceSource> | undefined,
  ruleName: string
): EvidenceSource | undefined {
  const needle = ruleName.trim();
  return evidences?.find(
    (e) =>
      e.result === 'found' &&
      typeof e.esql_query === 'string' &&
      e.esql_query.trim().length > 0 &&
      (e.rule_name?.trim() ?? '') === needle
  );
}

function buildTrendNlQuery(
  evidence: EvidenceSource,
  rangeFrom: string,
  rangeTo: string,
  bucketMinutes: number,
  tightened: boolean
): string {
  const retryHint = tightened
    ? dedent(`

      The previous attempt did not yield a visualization. Retry with a minimal XY time series:
      bucket by the primary @timestamp (or time field implied by the evidence), one COUNT measure,
      strictly within the requested window below.`)
    : '';

  return dedent(`
    Create an XY area chart showing this significant-event signal over time.

    Chart time window: from ${rangeFrom} to ${rangeTo}. Target bucket width about ${bucketMinutes} minutes (adjust slightly if required for valid ES|QL).

    Evidence rule name: ${evidence.rule_name}
    Stream: ${evidence.stream_name ?? '(unspecified)'}
    Evidence description: ${evidence.description ?? '(none)'}

    The following ES|QL is the promoted evidence query (often a sample / match query with LIMIT).
    Use it ONLY as intent: preserve data sources, filters, MATCH semantics, and field meaning, but ADAPT it into a time-bucketed aggregation suitable for this chart window.
    Do NOT use it verbatim when it contains LIMIT, a sample-only window, or shapes that are not a time-bucketed trend.

    Note: Do not omit empty intervals.

    Evidence ES|QL (intent only — adapt, do not paste verbatim):
    """
    ${evidence.esql_query}
    """
    ${retryHint}
  `);
}

function collectErrorMessages(results: ToolResult[] | undefined): string {
  if (!results?.length) {
    return 'No tool results returned from create_visualization.';
  }
  const messages = results.filter(isErrorResult).map((r) => r.data.message);
  if (messages.length > 0) {
    return messages.join('; ');
  }
  return 'create_visualization did not return a visualization result.';
}

export const runSigEventEvidenceTrend = async ({
  esClient,
  agentBuilder,
  searchInferenceEndpoints,
  request,
  logger,
  eventId,
  index,
  ruleName,
  rangeFrom,
  rangeTo,
  bucketMinutes,
}: {
  esClient: ElasticsearchClient;
  agentBuilder: AgentBuilderPluginStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  request: KibanaRequest;
  logger: Logger;
  eventId: string;
  index: string;
  ruleName: string;
  rangeFrom: string;
  rangeTo: string;
  bucketMinutes: number;
}): Promise<SigEventEvidenceTrendBody> => {
  try {
    const document = await getSignificantEventByEventId({ esClient, eventId, index });
    if (!document) {
      throw notFound(`Significant event not found for event_id ${eventId} in ${index}`);
    }

    const evidence = findEvidence(document.evidences, ruleName);
    if (!evidence) {
      throw notFound(`No found evidence with rule_name "${ruleName}" for this event`);
    }

    const { connectorId } = await resolveConnectorForFeature({
      searchInferenceEndpoints,
      featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
      request,
      logger,
    });

    const executeCreateVisualization = async (tightened: boolean) => {
      const query = buildTrendNlQuery(evidence, rangeFrom, rangeTo, bucketMinutes, tightened);
      return agentBuilder.tools.execute({
        request,
        toolId: platformCoreTools.createVisualization,
        toolParams: {
          query,
          chartType: SupportedChartType.XY,
        },
        defaultConnectorId: connectorId,
        source: 'user',
      });
    };

    let { results } = await executeCreateVisualization(false);
    let visualization = results?.find(isVisualizationResult);

    if (!visualization) {
      const firstError = collectErrorMessages(results);
      logger.warn(`Evidence trend create_visualization first attempt: ${firstError}`);
      ({ results } = await executeCreateVisualization(true));
      visualization = results?.find(isVisualizationResult);
    }

    if (!visualization) {
      return {
        success: false,
        error: collectErrorMessages(results),
      };
    }

    return {
      success: true,
      visualization: visualization.data,
    };
  } catch (err) {
    if (isBoom(err)) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Evidence trend pipeline failed: ${message}`);
    return { success: false, error: message };
  }
};
