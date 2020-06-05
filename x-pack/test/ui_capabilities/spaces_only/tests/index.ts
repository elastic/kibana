/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { FeaturesService } from '../../common/services';
import { SpaceScenarios } from '../scenarios';

export default function uiCapabilitesTests({ loadTestFile, getService }: FtrProviderContext) {
  const spacesService = getService('spaces');
  const featuresService: FeaturesService = getService('features');

  describe('ui capabilities', function () {
    this.tags('ciGroup9');

    before(async () => {
      // we're using a basic license, so if we want to disable all features, we have to ignore the valid licenses
      const features = await featuresService.get({ ignoreValidLicenses: true });
      for (const space of SpaceScenarios) {
        const disabledFeatures =
          space.disabledFeatures === '*' ? Object.keys(features) : space.disabledFeatures;
        await spacesService.create({
          ...space,
          disabledFeatures,
        });
      }
    });

    after(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.delete(space.id);
      }
    });

    loadTestFile(require.resolve('./catalogue'));
    loadTestFile(require.resolve('./foo'));
    loadTestFile(require.resolve('./nav_links'));
  });
}
