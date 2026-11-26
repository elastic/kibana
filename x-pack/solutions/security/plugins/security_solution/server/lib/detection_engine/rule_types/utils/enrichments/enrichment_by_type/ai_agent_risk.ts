/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';
import {
  ALERT_AI_AGENT_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_AI_AGENT_RISK_SCORE_CALCULATED_SCORE_NORM,
} from '../../../../../../../common/field_maps/field_names';
import {
  createEntityStoreEnrichment,
  getAiAgentEuidFromAlert,
} from '../create_entity_store_risk_enrichment';
import type { CreateRiskEnrichment } from '../types';
import {
  fetchAiAgentAncestorUserNames,
  getAiAgentAncestorUserName,
} from '../utils/ai_agent_ancestry';

const ENTITY_RISK_LEVEL_FIELD = 'entity.risk.calculated_level';
const ENTITY_RISK_SCORE_FIELD = 'entity.risk.calculated_score_norm';

/**
 * Stamps and enriches alerts with the AI agent they belong to. Descendant alerts take the agent's
 * user from their nearest agent ancestor process, falling back to their own `user.name` when the
 * ancestor isn't found.
 */
export const createV2AiAgentRiskEnrichments: CreateRiskEnrichment = async ({
  services,
  entityStoreCrudClient,
  logger,
  events,
}) => {
  if (!entityStoreCrudClient) return {};

  const ancestorUserNames = await fetchAiAgentAncestorUserNames({
    esClient: services.scopedClusterClient.asCurrentUser,
    events,
    logger,
  });

  return createEntityStoreEnrichment({
    name: 'AI Agent Risk',
    entityType: 'ai_agent',
    entityStoreCrudClient,
    logger,
    events,
    getEuid: (event) =>
      getAiAgentEuidFromAlert(event, getAiAgentAncestorUserName(event, ancestorUserNames)),
    enrichmentFields: [ENTITY_RISK_LEVEL_FIELD, ENTITY_RISK_SCORE_FIELD],
    createEnrichmentFunction: (fields) => (event) => {
      const riskLevel = fields[ENTITY_RISK_LEVEL_FIELD]?.[0] as string | undefined;
      const riskScore = fields[ENTITY_RISK_SCORE_FIELD]?.[0];
      if (!riskLevel && riskScore == null) {
        return event;
      }
      const newEvent = cloneDeep(event);
      if (riskLevel) {
        set(newEvent, `_source.${ALERT_AI_AGENT_RISK_SCORE_CALCULATED_LEVEL}`, riskLevel);
      }
      if (riskScore != null) {
        set(newEvent, `_source.${ALERT_AI_AGENT_RISK_SCORE_CALCULATED_SCORE_NORM}`, riskScore);
      }
      return newEvent;
    },
  });
};
