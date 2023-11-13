/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedQueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { CreateRulePropsRewrites } from './types';

export function getSavedQueryRuleParams(
  rewrites?: CreateRulePropsRewrites<SavedQueryRuleCreateProps>
): SavedQueryRuleCreateProps {
  return {
    type: 'saved_query',
    saved_id: 'some-id',
    query: 'host.name: *',
    name: 'Saved query rule',
    description: 'Saved query rule description',
    index: ['logs-*'],
    interval: '100m',
    from: 'now-50000h',
    severity: 'low',
    risk_score: 21,
    ...rewrites,
  };
}
