/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SavedObjectsManagementBuilder } from '../../common/saved_objects_management_builder';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

const savedObjectsManagementBuilder = new SavedObjectsManagementBuilder(false);

// eslint-disable-next-line import/no-default-export
export default function savedObjectsManagementTests({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('savedObjectsManagement', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          case 'superuser':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            const expected = mapValues(uiCapabilities.value!.savedObjectsManagement, () =>
              savedObjectsManagementBuilder.uiCapabilities('all')
            );
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(expected);
            break;
          case 'all':
          case 'dual_privileges_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.build({
                all: [
                  'config',
                  'graph-workspace',
                  'map',
                  'canvas-workpad',
                  'canvas-element',
                  'index-pattern',
                  'visualization',
                  'search',
                  'dashboard',
                  'telemetry',
                  'timelion-sheet',
                  'url',
                  'infrastructure-ui-source',
                ],
              })
            );
            break;
          case 'read':
          case 'dual_privileges_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.build({
                read: [
                  'config',
                  'graph-workspace',
                  'map',
                  'canvas-workpad',
                  'canvas-element',
                  'index-pattern',
                  'visualization',
                  'search',
                  'dashboard',
                  'timelion-sheet',
                  'url',
                  'infrastructure-ui-source',
                ],
              })
            );
            break;
          case 'foo_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.build({
                all: ['foo', 'telemetry'],
                read: ['index-pattern', 'config'],
              })
            );
            break;
          case 'foo_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.build({
                read: ['foo', 'index-pattern', 'config'],
              })
            );
            break;
          case 'no_kibana_privileges':
          case 'legacy_all':
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
