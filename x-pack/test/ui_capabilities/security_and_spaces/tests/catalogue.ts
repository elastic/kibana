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
import { UserAtSpaceScenarios } from '../scenarios';

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
    UserAtSpaceScenarios.forEach((scenario) => {
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
          case 'dual_privileges_all at everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except monitoring, and ES features are enabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) =>
                catalogueId !== 'monitoring' &&
                catalogueId !== 'osquery' &&
                !esFeatureExceptions.includes(catalogueId)
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'everything_space_all at everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except spaces, monitoring, the enterprise search suite, and ES features are enabled
            // (easier to say: all "proper" Kibana features are enabled)
            const exceptions = [
              'monitoring',
              'enterpriseSearch',
              'appSearch',
              'workplaceSearch',
              'spaces',
              'osquery',
              ...esFeatureExceptions,
            ];
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => !exceptions.includes(catalogueId)
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'global_read at everything_space':
          case 'dual_privileges_read at everything_space':
          case 'everything_space_read at everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except spaces, ml_file_data_visualizer, monitoring, the enterprise search suite, and ES features are enabled
            // (easier to say: all "proper" Kibana features are enabled)
            const exceptions = [
              'ml_file_data_visualizer',
              'monitoring',
              'enterpriseSearch',
              'appSearch',
              'workplaceSearch',
              'spaces',
              'osquery',
              ...esFeatureExceptions,
            ];
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => !exceptions.includes(catalogueId)
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          case 'foo_all at everything_space':
          case 'foo_read at everything_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything except foo is disabled
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => catalogueId === 'foo'
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          // the nothing_space has no Kibana features enabled, so even if we have
          // privileges to perform these actions, we won't be able to.
          // Note that ES features may still be enabled if the user has privileges, since
          // they cannot be disabled at the space level at this time.
          case 'superuser at nothing_space': {
            expect(uiCapabilities.success).to.be(true);
            expect(uiCapabilities.value).to.have.property('catalogue');
            // everything is disabled except for the es feature exceptions and spaces management
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) =>
                esFeatureExceptions.includes(catalogueId) || catalogueId === 'spaces'
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          // the nothing_space has no Kibana features enabled, so even if we have
          // privileges to perform these actions, we won't be able to.
          case 'global_all at nothing_space':
          case 'dual_privileges_all at nothing_space': {
            // everything is disabled except for spaces management
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => catalogueId === 'spaces'
            );
            expect(uiCapabilities.value!.catalogue).to.eql(expected);
            break;
          }
          // the nothing_space has no Kibana features enabled, so even if we have
          // privileges to perform these actions, we won't be able to.
          case 'global_read at nothing_space':
          case 'foo_all at nothing_space':
          case 'foo_read at nothing_space':
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
            const expected = mapValues(
              uiCapabilities.value!.catalogue,
              (enabled, catalogueId) => false
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
