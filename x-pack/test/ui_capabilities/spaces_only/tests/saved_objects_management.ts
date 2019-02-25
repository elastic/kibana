/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SavedObjectsManagementBuilder } from '../../common/saved_objects_management_builder';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

const savedObjectsManagementBuilder = new SavedObjectsManagementBuilder(true);

// tslint:disable:no-default-export
export default function savedObjectsManagementTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('savedObjectsManagement', () => {
    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        // spaces don't affect saved objects management, so we assert the same thing for every scenario
        const uiCapabilities = await uiCapabilitiesService.get(null, scenario.id);
        expect(uiCapabilities.success).to.be(true);
        expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
        expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
          savedObjectsManagementBuilder.all('all')
        );
      });
    });
  });
}
