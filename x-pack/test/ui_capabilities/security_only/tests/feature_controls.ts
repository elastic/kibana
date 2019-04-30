/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import {
  GetUICapabilitiesFailureReason,
  UICapabilitiesService,
} from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function featureControlsTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('featureControls', () => {
    UserScenarios.forEach(scenario => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          username: scenario.username,
          password: scenario.password,
        });
        switch (scenario.username) {
          case 'superuser':
          case 'all':
          case 'dual_privileges_all': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('featureControls');
            // everything is enabled
            const expected = mapValues(uiCapabilities.value!.featureControls, () => true);
            expect(uiCapabilities.value!.featureControls).to.eql(expected);
            break;
          }

          case 'read':
          case 'dual_privileges_read':
          case 'foo_all':
          case 'foo_read': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('featureControls');
            // everything is disabled
            const expected = mapValues(uiCapabilities.value!.featureControls, () => false);
            expect(uiCapabilities.value!.featureControls).to.eql(expected);
            expect(uiCapabilities.value!.featureControls).to.eql(expected);
            break;
          }
          // these users have no access to even get the ui capabilities
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
