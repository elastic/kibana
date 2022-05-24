/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { mapValues } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

export default function catalogueTests({ getService }: FtrProviderContext) {
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  const esFeatureExceptions = [
    'security',
    'index_lifecycle_management',
    'snapshot_restore',
    'rollup_jobs',
    'reporting',
    'transform',
    'watcher',
  ];

  const uiCapabilitiesExceptions = [
    // enterprise_search plugin is loaded but disabled because security isn't enabled in ES. That means the following 4 capabilities are disabled
    'enterpriseSearch',
    'enterpriseSearchContent',
    'appSearch',
    'workplaceSearch',
  ];

  describe('catalogue', () => {
    SpaceScenarios.forEach((scenario) => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get({ spaceId: scenario.id });
        switch (scenario.id) {
          case 'everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is enabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => !uiCapabilitiesExceptions.includes(catalogueId)
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'nothing_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is disabled except for ES features and spaces management
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) =>
                esFeatureExceptions.includes(catalogueId) || catalogueId === 'spaces'
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'foo_disabled_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // only foo is disabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) =>
                !uiCapabilitiesExceptions.includes(catalogueId) && catalogueId !== 'foo'
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
