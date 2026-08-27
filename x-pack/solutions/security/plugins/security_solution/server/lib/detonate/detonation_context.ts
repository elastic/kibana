/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import { getAnonymizedValue } from '@kbn/elastic-assistant-common';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';

import {
  DETONATE_TASKS_INDEX,
  collectMalwareFamilies,
  parseMalwareSignature,
} from '../../../common/detonate';

/** Caps keep the prompt bounded regardless of how many alerts a detonation produced. */
const MAX_SIGNATURES = 25;
const MAX_DETECTION_RULES = 25;

interface EndpointAlertGroup {
  alerts_count?: number | null;
  event_code?: string | null;
  rule_name?: string | null;
}

interface DetectionAlertGroup {
  alerts_count?: number | null;
  kibana_alert_rule_name?: string | null;
  kibana_alert_rule_parameters_severity?: string | null;
}

interface TaskSource {
  timestamp?: string;
  task?: {
    id?: string;
    sample_hash?: string;
    sample_ext?: string;
    sample_source?: string;
    vm_os_family?: string;
    vm_architecture?: string;
    elastic_agent_id?: string;
    agent_version?: string;
    production_endpoint_alerts_count?: number;
    production_detection_alerts_count?: number;
    production_endpoint_alert_groups?: EndpointAlertGroup[];
    production_detection_alert_groups?: DetectionAlertGroup[];
  };
}

const uniqueTruthy = (values: Array<string | null | undefined>, limit: number): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))].slice(0, limit);

export interface DetonationContextResult {
  context: Record<string, unknown>;
  replacements: Replacements;
}

/**
 * Builds the context handed to the model for a single detonation.
 *
 * Everything comes from the task document, which already denormalizes the alert groups, so no
 * alert documents are read here. Only the agent id is anonymized: it is the one value that
 * identifies the sandbox host. The sample hash is deliberately left intact because it is a public
 * malware identifier and is the subject of the summary.
 */
export const buildDetonationContext = async ({
  esClient,
  taskId,
  anonymizationFields,
}: {
  esClient: ElasticsearchClient;
  taskId: string;
  anonymizationFields: AnonymizationFieldResponse[];
}): Promise<DetonationContextResult | null> => {
  const result = await esClient.search<TaskSource>({
    index: DETONATE_TASKS_INDEX,
    size: 1,
    query: { term: { 'task.id.keyword': taskId } },
    ignore_unavailable: true,
  });

  const source = result.hits.hits[0]?._source;
  const task = source?.task;
  if (!task) {
    return null;
  }

  const endpointGroups = task.production_endpoint_alert_groups ?? [];
  const detectionGroups = task.production_detection_alert_groups ?? [];

  const ruleNames = endpointGroups.map(({ rule_name: ruleName }) => ruleName);

  const signatures = uniqueTruthy(
    ruleNames.filter((ruleName) => parseMalwareSignature(ruleName) !== null),
    MAX_SIGNATURES
  );

  const behaviorRules = uniqueTruthy(
    ruleNames.filter((ruleName) => parseMalwareSignature(ruleName) === null),
    MAX_SIGNATURES
  );

  const { anonymizedData, replacements } = getAnonymizedData({
    anonymizationFields,
    currentReplacements: {},
    rawData: { 'agent.id': [task.elastic_agent_id ?? ''] },
    getAnonymizedValue,
    getAnonymizedValues,
  });

  const context = {
    detonatedAt: source?.timestamp ?? null,
    sampleHash: task.sample_hash ?? null,
    sampleExtension: task.sample_ext ?? null,
    sampleSource: task.sample_source ?? null,
    platform: `${task.vm_os_family ?? 'unknown'}/${task.vm_architecture ?? 'unknown'}`,
    agentVersion: task.agent_version ?? null,
    agentId: anonymizedData['agent.id']?.[0] ?? null,
    endpointAlertsCount: task.production_endpoint_alerts_count ?? 0,
    detectionAlertsCount: task.production_detection_alerts_count ?? 0,
    protectionsFired: uniqueTruthy(
      endpointGroups.map(({ event_code: eventCode }) => eventCode),
      10
    ),
    malwareFamilies: collectMalwareFamilies(ruleNames),
    signaturesMatched: signatures,
    behaviorRulesTriggered: behaviorRules,
    detectionRulesTriggered: uniqueTruthy(
      detectionGroups.map(({ kibana_alert_rule_name: ruleName }) => ruleName),
      MAX_DETECTION_RULES
    ),
    detectionSeverities: uniqueTruthy(
      detectionGroups.map(({ kibana_alert_rule_parameters_severity: severity }) => severity),
      4
    ),
  };

  return { context, replacements };
};
