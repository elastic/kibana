/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { SavedObjectsManagementBuilder } from '../../common/saved_objects_management_builder';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

const savedObjectsManagementBuilder = new SavedObjectsManagementBuilder(false);

// tslint:disable:no-default-export
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
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.all('all')
            );
            break;
          case 'all':
          case 'dual_privileges_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: [
                  'config',
                  'graph-workspace',
                  'map',
                  'canvas-workpad',
                  'index-pattern',
                  'visualization',
                  'search',
                  'dashboard',
                  'timelion-sheet',
                ],
              })
            );
            break;
          case 'dual_privileges_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: [
                  'config',
                  'graph-workspace',
                  'map',
                  'canvas-workpad',
                  'index-pattern',
                  'visualization',
                  'search',
                  'dashboard',
                  'timelion-sheet',
                ],
              })
            );
            break;
          case 'apm_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'advancedSettings_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'config',
              })
            );
            break;
          case 'advancedSettings_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'canvas_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['config', 'index-pattern'],
                all: 'canvas-workpad',
              })
            );
            break;
          case 'canvas_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['canvas-workpad', 'config', 'index-pattern'],
              })
            );
            break;
          case 'dashboard_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'dashboard',
                read: [
                  'visualize',
                  'search',
                  'config',
                  'index-pattern',
                  'canvas-workpad',
                  'timelion-sheet',
                  'visualization',
                ],
              })
            );
            break;
          case 'dashboard_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: [
                  'dashboard',
                  'visualize',
                  'search',
                  'config',
                  'index-pattern',
                  'canvas-workpad',
                  'timelion-sheet',
                  'visualization',
                ],
              })
            );
            break;
          case 'dev_tools_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'dev_tools_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'discover_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'search',
                read: ['config', 'index-pattern'],
              })
            );
            break;
          case 'discover_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['search', 'config', 'index-pattern'],
              })
            );
            break;
          case 'graph_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'graph-workspace',
                read: ['config', 'index-pattern'],
              })
            );
            break;
          case 'graph_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['config', 'index-pattern', 'graph-workspace'],
              })
            );
            break;
          case 'maps_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'map',
                read: ['config', 'index-pattern'],
              })
            );
            break;
          case 'maps_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['map', 'config', 'index-pattern'],
              })
            );
            break;
          case 'infrastructure_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'infrastructure_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'logs_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'logs_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'ml_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'monitoring_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'timelion_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'timelion-sheet',
                read: ['config', 'index-pattern'],
              })
            );
            break;
          case 'timelion_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['config', 'index-pattern', 'timelion-sheet'],
              })
            );
            break;
          case 'uptime_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'uptime_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: 'config',
              })
            );
            break;
          case 'visualize_all':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                all: 'visualization',
                read: ['config', 'index-pattern', 'search'],
              })
            );
            break;
          case 'visualize_read':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('savedObjectsManagement');
            expect(uiCapabilities.value!.savedObjectsManagement).to.eql(
              savedObjectsManagementBuilder.only({
                read: ['config', 'index-pattern', 'search', 'visualization'],
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
