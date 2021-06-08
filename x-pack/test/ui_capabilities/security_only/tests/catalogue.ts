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
import { UserScenarios } from '../scenarios';

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
          case 'dual_privileges_all': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except ml, monitoring, and ES features are enabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) =>
                catalogueId !== 'ml' &&
                catalogueId !== 'monitoring' &&
                catalogueId !== 'ml_file_data_visualizer' &&
                !esFeatureExceptions.includes(catalogueId)
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'read':
          case 'dual_privileges_read': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except ml and monitoring and enterprise search is enabled
            const exceptions = [
              'ml',
              'ml_file_data_visualizer',
              'monitoring',
              'enterpriseSearch',
              'appSearch',
              'workplaceSearch',
              ...esFeatureExceptions,
            ];
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => !exceptions.includes(catalogueId)
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
