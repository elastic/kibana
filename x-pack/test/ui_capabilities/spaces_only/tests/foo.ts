/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

export default function fooTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('foo', () => {
    SpaceScenarios.forEach((scenario) => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({ spaceId: scenario.id });
        switch (scenario.id) {
          case 'everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('foo');
            expect(uiCapabilities.value!.foo).to.eql({
              create: true,
              edit: true,
              delete: true,
              show: true,
            });
            break;
          case 'nothing_space':
          case 'foo_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('foo');
            expect(uiCapabilities.value!.foo).to.eql({
              create: false,
              edit: false,
              delete: false,
              show: false,
            });
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
