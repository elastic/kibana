/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureKibanaPrivilegesReference, KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { expect } from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';

function collectReplacedByForFeaturePrivileges(
  feature: KibanaFeatureConfig
): Array<[string, readonly FeatureKibanaPrivilegesReference[]]> {
  const privilegesToReplace = [] as Array<[string, readonly FeatureKibanaPrivilegesReference[]]>;
  if (feature.privileges) {
    const allReplacedBy = feature.privileges.all.replacedBy ?? [];
    const readReplacedBy = feature.privileges.read.replacedBy ?? [];
    privilegesToReplace.push([
      'all',
      'default' in allReplacedBy ? allReplacedBy.default : allReplacedBy,
    ]);
    privilegesToReplace.push([
      'minimal_all',
      'minimal' in allReplacedBy ? allReplacedBy.minimal : allReplacedBy,
    ]);
    privilegesToReplace.push([
      'read',
      'default' in readReplacedBy ? readReplacedBy.default : readReplacedBy,
    ]);
    privilegesToReplace.push([
      'minimal_read',
      'minimal' in readReplacedBy ? readReplacedBy.minimal : readReplacedBy,
    ]);
  }

  for (const subFeature of feature.subFeatures ?? []) {
    for (const group of subFeature.privilegeGroups) {
      for (const subFeaturePrivilege of group.privileges) {
        privilegesToReplace.push([subFeaturePrivilege.id, subFeaturePrivilege.replacedBy ?? []]);
      }
    }
  }

  return privilegesToReplace;
}

function getActionsToReplace(actions: string[]) {
  // The `ui:`-prefixed actions are special since they are prefixed with a feature ID, and do not need to be replaced
  // like any other privileges.
  // TODO: What about `alerting`?
  return actions.filter((action) => !action.startsWith('ui:') && !action.startsWith('alerting:'));
}

function getUserCredentials(username: string) {
  return `Basic ${Buffer.from(`${username}:changeme`).toString('base64')}`;
}

export default function ({ getService }: FtrProviderContext) {
  describe('deprecated features', function () {
    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const log = getService('log');
    const security = getService('security');

    before(async () => {
      // Create role with deprecated feature privilege.
      await security.role.create('case_2_deprecated', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_2_feature_a: ['all'] } }],
      });

      // Create role with the privileges that are supposed to replace deprecated privilege.
      await security.role.create('case_2_new', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: { case_2_feature_b: ['all'], case_2_feature_c: ['all'] },
          },
        ],
      });

      await security.user.create('case_2_deprecated', {
        password: 'changeme',
        roles: ['case_2_deprecated'],
        full_name: 'Deprecated',
      });

      await security.user.create('case_2_new', {
        password: 'changeme',
        roles: ['case_2_new'],
        full_name: 'New',
      });
    });

    after(async () => {
      // Cleanup roles.
      await Promise.all([
        security.role.delete('case_2_deprecated'),
        security.role.delete('case_2_new'),
        security.user.delete('case_2_deprecated'),
        security.user.delete('case_2_new'),
      ]);
    });

    it('all privileges of the deprecated features should have a proper replacement', async () => {
      // Fetch all features first.
      const featuresResponse = await supertest.get('/api/features').expect(200);
      const features = featuresResponse.body as KibanaFeatureConfig[];

      // Collect all deprecated features.
      const deprecatedFeatures = features.filter((f) => f.deprecated);
      log.info(`Found ${deprecatedFeatures.length} deprecated features.`);

      // Fetch all feature privileges registered as Elasticsearch application privileges.
      const privilegesResponse = await supertest
        .get('/api/security/privileges?includeActions=true')
        .expect(200);
      const featurePrivilegesAndActions = privilegesResponse.body.features as Record<
        string,
        Record<string, string[]>
      >;

      // Ensure that all deprecated features registered their privileges as Elasticsearch application privileges.
      for (const feature of deprecatedFeatures) {
        const privilegeReplacedBy = collectReplacedByForFeaturePrivileges(feature);
        for (const [privilegeId, replacedBy] of privilegeReplacedBy) {
          log.debug(
            `Verifying that deprecated "${feature.id}" feature has registered "${privilegeId}" privilege in Elasticsearch.`
          );

          // Capture all actions from the deprecated feature that need to be replaced.
          const deprecatedActions = getActionsToReplace(
            featurePrivilegesAndActions[feature.id]?.[privilegeId] ?? []
          );

          // Capture all actions that will replace the deprecated actions.
          const replacementActions = new Set(
            replacedBy.flatMap(({ feature: featureId, privileges }) =>
              privileges.flatMap((privilege) =>
                getActionsToReplace(featurePrivilegesAndActions[featureId]?.[privilege] ?? [])
              )
            )
          );
          log.debug(
            `Privilege "${privilegeId}" of the deprecated feature "${feature.id}" has ${deprecatedActions.length} actions that will be replaced with ${replacementActions.size} actions.`
          );

          for (const deprecatedAction of deprecatedActions) {
            if (!replacementActions.has(deprecatedAction)) {
              throw new Error(
                `Action "${deprecatedAction}" granted by the privilege "${privilegeId}" of the deprecated feature "${feature.id}" is not properly replaced.`
              );
            }
          }
        }
      }
    });

    it('replaced UI actions are properly set for deprecated privileges', async () => {
      const { body: capabilities } = await supertestWithoutAuth
        .post('/api/core/capabilities')
        .set('Authorization', getUserCredentials('case_2_deprecated'))
        .set('kbn-xsrf', 'xxx')
        .send({ applications: [] })
        .expect(200);

      // Both deprecated and new UI capabilities should be toggled.
      expect(capabilities).toEqual(
        expect.objectContaining({
          // UI flags from the deprecated feature privilege.
          case_2_feature_a: {
            ui_all_one: true,
            ui_all_two: true,
            ui_read_one: false,
            ui_read_two: false,
          },

          // UI flags from the feature privileges that replace deprecated one.
          case_2_feature_b: { ui_all_one: true, ui_read_one: false },
          case_2_feature_c: { ui_all_two: true, ui_read_two: false },
        })
      );
    });
  });
}
