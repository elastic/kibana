/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SpaceScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function uiCapabilitesTests({
  loadTestFile,
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const spacesService: SpacesService = getService('spaces');

  describe('ui capabilities', function() {
    this.tags('ciGroup5');

    before(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.create(space);
      }
    });

    after(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.delete(space.id);
      }
    });

    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./dashboard'));
    loadTestFile(require.resolve('./discover'));
    loadTestFile(require.resolve('./nav_links'));
    loadTestFile(require.resolve('./visualize'));
  });
}
