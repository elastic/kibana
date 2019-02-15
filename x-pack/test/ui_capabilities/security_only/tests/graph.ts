/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { UICapabilities } from 'ui/capabilities';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function graphTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('graph', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });

        const capabilities: UICapabilities = uiCapabilities.value as UICapabilities;

        switch (scenario.username) {
          // these users have a read/write view of Graph
          case 'superuser':
          case 'all':
          case 'apm_user_and_all':
          case 'dual_privileges_all':
          case 'graph_all':
          case 'machine_learning_admin_and_all':
          case 'machine_learning_user_and_all':
          case 'monitoring_user_and_all':
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('graph');
            expect(capabilities!.graph).to.eql({
              save: true,
              delete: true,
            });
            break;
          // these users have a read-only view of Graph
          case 'dual_privileges_read':
          case 'graph_read':
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('graph');
            expect(capabilities!.graph).to.eql({
              save: false,
              delete: false,
            });
            break;
          // these users have no access to even get the ui capabilities
          case 'legacy_all':
          case 'no_kibana_privileges':
          case 'apm_user':
          case 'machine_learning_admin':
          case 'machine_learning_user':
          case 'monitoring_user':
            expect(uiCapabilities.success).to.be(false);
            expect(uiCapabilities.failureReason).to.be(GetUICapabilitiesFailureReason.NotFound);
            break;
          // all other users can't do anything with Graph
          default:
            expect(uiCapabilities.success).to.be(true);
            expect(capabilities).to.have.property('graph');
            expect(capabilities!.graph).to.eql({
              save: false,
              delete: false,
            });
        }
      });
    });
  });
}
