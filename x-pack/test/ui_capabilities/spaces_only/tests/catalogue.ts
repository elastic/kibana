/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

export default function catalogueTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('catalogue', () => {
    SpaceScenarios.forEach((scenario) => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({ spaceId: scenario.id });
        switch (scenario.id) {
          case 'everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is enabled
            const expected = mapValues(uiCapabilities.value!.catalogue, () => true);
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'nothing_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is disabled
            const expected = mapValues(uiCapabilities.value!.catalogue, () => false);
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'foo_disabled_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // only foo is disabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (value, catalogueId) => catalogueId !== 'foo'
            );
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
