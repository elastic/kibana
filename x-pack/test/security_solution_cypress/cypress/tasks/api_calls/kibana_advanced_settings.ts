/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID } from '@kbn/management-settings-ids';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '@kbn/security-solution-plugin/common/constants';
import { rootRequest } from './common';

export const setKibanaSetting = (key: string, value: boolean | number | string) => {
  rootRequest({
    method: 'POST',
    url: 'internal/kibana/settings',
    body: { changes: { [key]: value } },
  });
};

export const enableRelatedIntegrations = () => {
  setKibanaSetting(SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID, true);
};

export const disableRelatedIntegrations = () => {
  setKibanaSetting(SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID, false);
};

export const enableAssetCriticality = () => {
  setKibanaSetting(ENABLE_ASSET_CRITICALITY_SETTING, true);
};
