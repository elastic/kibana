/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  describe('trained models', function () {
    before(async () => {
      await ml.trainedModels.createdTestTrainedModels('classification', 15);
      await ml.trainedModels.createdTestTrainedModels('regression', 15);
      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToTrainedModels();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('renders trained models list', async () => {
      await ml.trainedModels.assertRowsNumberPerPage(10);
      // +1 because of the built-in model
      await ml.trainedModels.assertStats(31);
    });
  });
}
