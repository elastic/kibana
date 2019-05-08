/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SavedObjectsManagementBuilder } from '../../common/saved_objects_management_builder';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserAtSpaceScenarios } from '../scenarios';
import { assertDeeplyFalse } from '../../common/lib/assert_deeply_false';

const savedObjectsManagementBuilder = new SavedObjectsManagementBuilder(true);

// eslint-disable-next-line import/no-default-export
export default function savedObjectsManagementTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('savedObjectsManagement', () => {
    UserAtSpaceScenarios.forEach(scenario => {
      it(`${scenario.id}`, async () => {
        const { user, space } = scenario;

        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: { username: user.username, password: user.password },
          spaceId: space.id,
        });
        expect(uiCapabilities.success).to.be(true);
        expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
        switch (scenario.id) {
          case 'superuser at everything_space':
          case 'global_all at everything_space':
          case 'dual_privileges_all at everything_space':
          case 'everything_space_all at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            const expected = mapValues(uiCapabilities.value!.savedObjectsManagement, () =>
              savedObjectsManagementBuilder.uiCapabilities('all')
            );
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(expected);
            break;

          case 'dual_privileges_read at everything_space':
          case 'global_read at everything_space':
          case 'everything_space_read at everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            const readExpected = mapValues(uiCapabilities.value!.savedObjectsManagement, () =>
              savedObjectsManagementBuilder.uiCapabilities('read')
            );
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(readExpected);
            break;

          case 'superuser at nothing_space':
          case 'nothing_space_all at nothing_space':
          case 'nothing_space_read at nothing_space':
          case 'global_all at nothing_space':
          case 'global_read at nothing_space':
          case 'dual_privileges_all at nothing_space':
          case 'dual_privileges_read at nothing_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            const noneExpected = mapValues(uiCapabilities.value!.savedObjectsManagement, () =>
              savedObjectsManagementBuilder.uiCapabilities('none')
            );
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(noneExpected);
            break;
          case 'no_kibana_privileges at everything_space':
          case 'no_kibana_privileges at nothing_space':
          case 'legacy_all at everything_space':
          case 'legacy_all at nothing_space':
          case 'everything_space_all at nothing_space':
          case 'everything_space_read at nothing_space':
          case 'nothing_space_all at everything_space':
          case 'nothing_space_read at everything_space':
            assertDeeplyFalse(uiCapabilities.value!.savedObjectsManagement);
            break;

          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
