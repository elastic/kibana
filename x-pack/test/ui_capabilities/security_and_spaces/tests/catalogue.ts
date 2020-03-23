/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { UserAtSpaceScenarios } from '../scenarios';

export default function catalogueTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('catalogue', () => {
    UserAtSpaceScenarios.forEach(scenario => {
      it(`${scenario.id}`, async () => {
        const { user, space } = scenario;

        const uiCapabilities = await uiCapabilitiesService.get({
          credentials: { username: user.username, password: user.password },
          spaceId: space.id,
        });
        switch (scenario.id) {
          case 'superuser at everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is enabled
            const expected = mapValues(uiCapabilities.value!.catalogue, () => true);
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'global_all at everything_space':
          case 'dual_privileges_all at everything_space':
          case 'everything_space_all at everything_space':
          case 'global_read at everything_space':
          case 'dual_privileges_read at everything_space':
          case 'everything_space_read at everything_space': {
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
          // the nothing_space has no features enabled, so even if we have
          // privileges to perform these actions, we won't be able to
          case 'superuser at nothing_space':
          case 'global_all at nothing_space':
          case 'global_read at nothing_space':
          case 'dual_privileges_all at nothing_space':
          case 'dual_privileges_read at nothing_space':
          case 'nothing_space_all at nothing_space':
          case 'nothing_space_read at nothing_space':
          case 'no_kibana_privileges at everything_space':
          case 'no_kibana_privileges at nothing_space':
          case 'legacy_all at everything_space':
          case 'legacy_all at nothing_space':
          case 'everything_space_all at nothing_space':
          case 'everything_space_read at nothing_space':
          case 'nothing_space_all at everything_space':
          case 'nothing_space_read at everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is disabled
            const expected = mapValues(uiCapabilities.value!.catalogue, () => false);
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
