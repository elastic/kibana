/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SavedObjectsManagementBuilder } from '../../common/saved_objects_management_builder';
import {
  UICapabilitiesService,
  GetUICapabilitiesFailureReason,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

const savedObjectsManagementBuilder = new SavedObjectsManagementBuilder();

// eslint-disable-next-line import/no-default-export
export default function savedObjectsManagementTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('savedObjectsManagement', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: {
            username: scenario.username,
            password: scenario.password,
          },
        });
        switch (scenario.username) {
          case 'superuser':
          case 'all':
          case 'dual_privileges_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.uiCapabilities('all')
            );
            break;
          case 'read':
          case 'dual_privileges_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.uiCapabilities('read')
            );
            break;
          case 'foo_all':
          case 'foo_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.uiCapabilities('none')
            );
            break;
          case 'no_kibana_privileges':
          // these users have no access to any ui capabilities
          case 'legacy_all':
          case 'no_kibana_privileges':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(GetUICapabilitiesFailureReason.NotFound);
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
