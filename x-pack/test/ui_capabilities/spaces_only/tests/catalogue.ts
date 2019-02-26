/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function catalogueTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('catalogue', () => {
    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get(null, scenario.id);
        switch (scenario.id) {
          case 'everything_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            expect(uiCapabilities.value!.catalogue).to.have.property('foo');
            expect(uiCapabilities.value!.catalogue.foo).to.be(true);
            break;
          case 'nothing_space':
          case 'foo_disabled_space':
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            expect(uiCapabilities.value!.catalogue).to.have.property('foo');
            expect(uiCapabilities.value!.catalogue.foo).to.be(false);
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
