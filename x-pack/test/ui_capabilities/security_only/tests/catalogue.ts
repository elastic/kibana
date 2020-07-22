/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserScenarios } from '../scenarios';

export default function catalogueTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('catalogue', () => {
    UserScenarios.forEach((scenario) => {
      it(`${scenario.fullName}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: {
            username: scenario.username,
            password: scenario.password,
          },
        });
        switch (scenario.username) {
          case 'superuser': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is enabled
            const expected = mapValues(uiCapabilities.value!.catalogue, () => true);
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'all':
          case 'read':
          case 'dual_privileges_all':
          case 'dual_privileges_read': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except ml and monitoring is enabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => catalogueId !== 'ml' && catalogueId !== 'monitoring'
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'foo_all':
          case 'foo_read': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // only foo is enabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (value, catalogueId) => catalogueId === 'foo'
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          // these users have no access to even get the ui capabilities
          case 'legacy_all':
          case 'no_kibana_privileges':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // only foo is enabled
            const expected = mapValues(uiCapabilities.value!.catalogue, () => false);
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
