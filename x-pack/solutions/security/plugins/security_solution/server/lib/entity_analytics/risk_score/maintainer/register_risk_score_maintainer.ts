/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import { INTERVAL } from '../tasks/constants';
import {
  createRiskScoreMaintainer,
  type RegisterRiskScoreMaintainerDeps,
} from './risk_score_maintainer';

export const registerRiskScoreMaintainer = ({
  entityStore,
  ...deps
}: RegisterRiskScoreMaintainerDeps & {
  entityStore: EntityStoreSetupContract | undefined;
}): void => {
  if (!entityStore) {
    deps.logger.info('Entity Store is unavailable; skipping risk score maintainer registration.');
    return;
  }

  const maintainer = createRiskScoreMaintainer(deps);

  entityStore.registerEntityMaintainer({
    id: 'risk-score',
    description: 'Entity Analytics Risk Score Maintainer',
    interval: INTERVAL,
    initialState: {},
    setup: maintainer.setup,
    run: maintainer.run,
  });
};
