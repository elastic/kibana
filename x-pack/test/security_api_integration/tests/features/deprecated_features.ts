/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureKibanaPrivilegesReference, KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

function collectReplacedByForFeaturePrivileges(
  feature: KibanaFeatureConfig
): Array<[string, readonly FeatureKibanaPrivilegesReference[]]> {
  const privilegesToReplace = [] as [string, readonly FeatureKibanaPrivilegesReference[]];
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

export default function ({ getService }: FtrProviderContext) {
  describe('deprecated features', function () {
    const supertest = getService('supertest');
    const log = getService('log');

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
        string[]
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

    it('replaced UI actions are properly set for deprecated privileges', async () => {});
  });
}
