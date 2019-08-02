/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { FeaturesService } from '../../common/services';
import { SpaceScenarios } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function uiCapabilitesTests({
  loadTestFile,
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const spacesService: SpacesService = getService('spaces');
  const featuresService: FeaturesService = getService('features');

  describe('ui capabilities', function() {
    this.tags('ciGroup9');

    before(async () => {
      const features = await featuresService.get();
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
