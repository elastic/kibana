/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common/entity_analytics/entity_store/constants';
import { isIdBasedRiskScoringEnabled } from '../../../../common/entity_analytics/risk_score/is_id_based_risk_scoring_enabled';

export const getIsIdBasedRiskScoringEnabled = async (
  uiSettingsClient: IUiSettingsClient
): Promise<boolean> => {
  const entityStoreV2Enabled = await uiSettingsClient.get<boolean>(FF_ENABLE_ENTITY_STORE_V2);

  return isIdBasedRiskScoringEnabled({ entityStoreV2Enabled });
};
