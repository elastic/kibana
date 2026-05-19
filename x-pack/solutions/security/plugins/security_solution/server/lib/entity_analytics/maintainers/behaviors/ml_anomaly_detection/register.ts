/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import {
  ML_AD_MAINTAINER_ID,
  ML_AD_MAINTAINER_INTERVAL,
  ML_AD_MAINTAINER_TIMEOUT,
} from './constants';
import {
  createMlAnomalyDetectionBehaviorMaintainer,
  type RegisterMlAnomalyDetectionMaintainerDeps,
} from './maintainer';

export const registerMlAnomalyDetectionBehaviorMaintainer = ({
  entityStore,
  ml,
  ...deps
}: RegisterMlAnomalyDetectionMaintainerDeps & {
  entityStore: EntityStoreSetupContract | undefined;
}): void => {
  if (!entityStore) {
    deps.logger.info(
      'Entity Store is unavailable; skipping ML anomaly detection behavior maintainer registration.'
    );
    return;
  }

  if (!ml) {
    deps.logger.info(
      'ML plugin is unavailable; skipping ML anomaly detection behavior maintainer registration.'
    );
    return;
  }

  const maintainer = createMlAnomalyDetectionBehaviorMaintainer({ ...deps, ml });

  entityStore.registerEntityMaintainer({
    id: ML_AD_MAINTAINER_ID,
    description: 'Entity Analytics ML Anomaly Detection Maintainer',
    interval: ML_AD_MAINTAINER_INTERVAL,
    timeout: ML_AD_MAINTAINER_TIMEOUT,
    minLicense: 'platinum',
    initialState: {},
    setup: maintainer.setup,
    run: maintainer.run,
  });
};
