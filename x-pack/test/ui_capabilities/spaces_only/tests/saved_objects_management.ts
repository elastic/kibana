/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SavedObjectsManagementBuilder } from '../../common/saved_objects_management_builder';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

const savedObjectsManagementBuilder = new SavedObjectsManagementBuilder();

// eslint-disable-next-line import/no-default-export
export default function savedObjectsManagementTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('savedObjectsManagement', () => {
    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        switch (scenario.id) {
          case 'nothing_space':
            // Saved Objects Managment is not available when everything is disabled.
            const nothingSpaceCapabilities = await uiCapabilitiesService.get({
              spaceId: scenario.id,
            });
            expect(nothingSpaceCapabilities.success).to.be(true);
            expect(nothingSpaceCapabilities.value).to.have.property('savedObjectsManagement');
            expect(nothingSpaceCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.uiCapabilities('none')
            );
            break;
          default:
            // Otherwise it's available without restriction
            const uiCapabilities = await uiCapabilitiesService.get({ spaceId: scenario.id });
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.uiCapabilities('all')
            );
        }
      });
    });
  });
}
