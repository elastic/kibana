/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';
import {
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM,
} from '../../../../../../../common/field_maps/field_names';
import { createEntityStoreEnrichment } from '../create_entity_store_risk_enrichment';
import type { CreateRiskEnrichment } from '../types';

const ENTITY_RISK_LEVEL_FIELD = 'entity.risk.calculated_level';
const ENTITY_RISK_SCORE_FIELD = 'entity.risk.calculated_score_norm';

export const createV2HostRiskEnrichments: CreateRiskEnrichment = async ({
  entityStoreCrudClient,
  logger,
  events,
}) => {
  if (!entityStoreCrudClient) return {};

  return createEntityStoreEnrichment({
    name: 'Host Risk',
    entityType: 'host',
    entityStoreCrudClient,
    logger,
    events,
    enrichmentFields: [ENTITY_RISK_LEVEL_FIELD, ENTITY_RISK_SCORE_FIELD],
    createEnrichmentFunction: (fields) => (event) => {
      const riskLevel = fields[ENTITY_RISK_LEVEL_FIELD]?.[0] as string | undefined;
      const riskScore = fields[ENTITY_RISK_SCORE_FIELD]?.[0];
      if (!riskLevel && riskScore == null) {
        return event;
      }
      const newEvent = cloneDeep(event);
      if (riskLevel) {
        set(newEvent, `_source.${ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL}`, riskLevel);
      }
      if (riskScore != null) {
        set(newEvent, `_source.${ALERT_HOST_RISK_SCORE_CALCULATED_SCORE_NORM}`, riskScore);
      }
      return newEvent;
    },
  });
};
