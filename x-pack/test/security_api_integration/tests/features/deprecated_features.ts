/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';

import type { Case, CasePostRequest } from '@kbn/cases-plugin/common';
import { CaseSeverity, ConnectorTypes } from '@kbn/cases-plugin/common';
import type { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';
import type {
  FeatureKibanaPrivilegesReference,
  KibanaFeatureConfig,
} from '@kbn/features-plugin/common';
import type { Role } from '@kbn/security-plugin-types-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

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
  // The `alerting:`-prefixed actions are special since they are prefixed with a feature ID, and do
  // not need to be replaced like any other privileges.
  return actions.filter((action) => !action.startsWith('alerting:'));
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
      await security.role.create('case_2_a_deprecated', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_2_feature_a: ['all'] } }],
      });

      // Fetch the _transformed_ deprecated role and use it to create a new role.
      const { elasticsearch, kibana } = (await security.role.get('case_2_a_deprecated', {
        replaceDeprecatedPrivileges: true,
      })) as Role;
      expect(kibana).toEqual([
        {
          spaces: ['*'],
          base: [],
          feature: { case_2_feature_b: ['all'], case_2_feature_c: ['all'] },
        },
      ]);
      await security.role.create('case_2_a_transformed', { elasticsearch, kibana });

      // Create roles with the privileges that are supposed to replace deprecated privilege.
      await security.role.create('case_2_b_new', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_2_feature_b: ['all'] } }],
      });
      await security.role.create('case_2_c_new', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_2_feature_c: ['all'] } }],
      });

      await security.user.create('case_2_a_deprecated', {
        password: 'changeme',
        roles: ['case_2_a_deprecated'],
        full_name: 'Deprecated',
      });

      await security.user.create('case_2_a_transformed', {
        password: 'changeme',
        roles: ['case_2_a_transformed'],
        full_name: 'Transformed',
      });

      await security.user.create('case_2_b_new', {
        password: 'changeme',
        roles: ['case_2_b_new'],
        full_name: 'New B',
      });

      await security.user.create('case_2_c_new', {
        password: 'changeme',
        roles: ['case_2_c_new'],
        full_name: 'New C',
      });
    });

    after(async () => {
      // Cleanup roles and users.
      await Promise.all([
        security.role.delete('case_2_a_deprecated'),
        security.role.delete('case_2_a_transformed'),
        security.role.delete('case_2_b_new'),
        security.role.delete('case_2_c_new'),
        security.user.delete('case_2_a_deprecated'),
        security.user.delete('case_2_a_transformed'),
        security.user.delete('case_2_b_new'),
        security.user.delete('case_2_c_new'),
      ]);

      // Cleanup cases.
      const { body: cases } = await supertest
        .get(`/api/cases/_find`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const casesIds = (cases as CasesFindResponse).cases.map((c) => c.id);
      if (casesIds.length > 0) {
        await supertest
          .delete(`/api/cases`)
          // we need to json stringify here because just passing in the array of case IDs will cause a 400 with Kibana
          // not being able to parse the array correctly. The format ids=["1", "2"] seems to work, which stringify outputs.
          .query({ ids: JSON.stringify(casesIds) })
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);
      }

      // Cleanup alerting rules.
      const { body: rules } = await supertest.get(`/api/alerting/rules/_find`).expect(200);
      for (const rule of rules.data) {
        await supertest.delete(`/api/alerting/rule/${rule.id}`).set('kbn-xsrf', 'true').expect(204);
      }
    });

    it('all deprecated features are known', async () => {
      const { body: features } = await supertest
        .get('/internal/features_provider/features')
        .expect(200);

      // **NOTE**: This test is to ensure the AppEx Security team has a chance to review all features marked as
      // deprecated. If you’re adding a new deprecated feature, make sure to add it to the list below manually or by
      // running the API integration test locally with the --updateSnapshot flag.
      expectSnapshot(
        (features as KibanaFeatureConfig[]).flatMap((f) => (f.deprecated ? [f.id] : [])).sort()
      ).toMatchInline(`
        Array [
          "case_1_feature_a",
          "case_2_feature_a",
          "case_3_feature_a",
          "case_4_feature_a",
          "case_4_feature_b",
          "dashboard",
          "discover",
          "generalCases",
          "generalCasesV2",
          "maps",
          "observabilityCases",
          "observabilityCasesV2",
          "securitySolutionCases",
          "securitySolutionCasesV2",
          "siem",
          "visualize",
        ]
      `);
    });

    it('all deprecated features are replaced by a single feature only or explicitly specify replacement features', async () => {
      const featuresResponse = await supertest
        .get('/internal/features_provider/features')
        .expect(200);
      const features = featuresResponse.body as KibanaFeatureConfig[];

      // **NOTE**: This test ensures that deprecated features displayed in the Space’s feature visibility toggles screen
      // are only replaced by a single feature unless explicitly configured otherwise by the developer. This approach
      // validates that if a deprecated feature was toggled off for a particular Space, there is no ambiguity about
      // which replacement feature or features should also be toggled off. Currently, we don’t anticipate having many
      // deprecated features replaced by more than one feature, so this test is designed to catch such scenarios early.
      // If there’s a need for a deprecated feature to be replaced by multiple features, please reach out to the AppEx
      // Security team to discuss how this should affect Space’s feature visibility toggles. You may need to explicitly
      // specify feature replacements in the feature configuration (`feature.deprecated.replacedBy`).
      const featureIdsImplicitlyReplacedWithMultipleFeatures = new Set([
        'case_2_feature_a',
        'case_4_feature_a',
        'discover',
        'dashboard',
        'visualize',
        'maps',
        'siem',
      ]);
      for (const feature of features) {
        if (
          !feature.deprecated ||
          (feature.deprecated?.replacedBy?.length ?? 0) > 0 ||
          featureIdsImplicitlyReplacedWithMultipleFeatures.has(feature.id)
        ) {
          continue;
        }

        // Collect all feature privileges including the ones provided by sub-features, if any.
        const allPrivileges = Object.values(feature.privileges ?? {}).concat(
          feature.subFeatures?.flatMap((subFeature) =>
            subFeature.privilegeGroups.flatMap(({ privileges }) => privileges)
          ) ?? []
        );

        // Collect all features IDs that are referenced by the deprecated feature privileges.
        const referencedFeaturesIds = new Set();
        for (const privilege of allPrivileges) {
          const replacedBy = privilege.replacedBy
            ? 'default' in privilege.replacedBy
              ? privilege.replacedBy.default.concat(privilege.replacedBy.minimal)
              : privilege.replacedBy
            : [];
          for (const privilegeReference of replacedBy) {
            referencedFeaturesIds.add(privilegeReference.feature);
          }
        }

        if (referencedFeaturesIds.size > 1) {
          throw new Error(
            `Feature "${
              feature.id
            }" is deprecated and implicitly replaced by more than one feature: ${
              referencedFeaturesIds.size
            } features: ${Array.from(referencedFeaturesIds).join(
              ', '
            )}. If it's intentional, please contact the AppEx Security team.`
          );
        }
      }
    });

    it('all privileges of the deprecated features should have a proper replacement', async () => {
      // Fetch all features first.
      const featuresResponse = await supertest
        .get('/internal/features_provider/features')
        .expect(200);
      const features = featuresResponse.body as KibanaFeatureConfig[];

      // Check if the action provided by the deprecated feature is directly replaceable by other
      // features. The `ui:`-prefixed actions are special since they are prefixed with a feature ID,
      // and do not need to be replaced like any other privilege actions.
      const isReplaceableAction = (action: string) => !action.startsWith('ui:');

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
            if (
              isReplaceableAction(deprecatedAction) &&
              !replacementActions.has(deprecatedAction)
            ) {
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
        .set('Authorization', getUserCredentials('case_2_a_deprecated'))
        .set('kbn-xsrf', 'xxx')
        .send({ applications: [] })
        .expect(200);

      // Only new UI capabilities should be toggled, deprecated ones should not be present.
      expect(capabilities).toEqual(
        expect.objectContaining({
          // UI flags from the feature privileges that replace deprecated one.
          case_2_feature_b: { ui_all_one: true, ui_read_one: false },
          case_2_feature_c: { ui_all_two: true, ui_read_two: false },
        })
      );
      for (const deprecatedFeatureId of [
        'case_1_feature_a',
        'case_2_feature_a',
        'case_3_feature_a',
        'case_4_feature_a',
        'case_4_feature_b',
      ]) {
        expect(capabilities).not.toHaveProperty(deprecatedFeatureId);
      }
    });

    it('Cases privileges are properly handled for deprecated privileges', async () => {
      const createCase = async (
        authorization: string,
        props: Partial<CasePostRequest> = {}
      ): Promise<Case> => {
        const caseRequest: CasePostRequest = {
          description: 'This is a case created by a user with deprecated privilege.',
          title: 'case_2_a_deprecated',
          tags: ['defacement'],
          severity: CaseSeverity.LOW,
          connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
          settings: { syncAlerts: true },
          owner: 'cases_owner_one',
          assignees: [],
          ...props,
        };

        const { body: newCase } = await supertestWithoutAuth
          .post('/api/cases')
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .send(caseRequest)
          .expect(200);
        return newCase;
      };

      const getCase = async (authorization: string, caseId: string): Promise<Case | undefined> => {
        const { body } = await supertestWithoutAuth
          .get(`/api/cases/_find`)
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return (body as CasesFindResponse).cases.find((c) => c.id === caseId);
      };

      // Create cases as user with deprecated privilege.
      const deprecatedUser = getUserCredentials('case_2_a_deprecated');
      const caseOneDeprecated = await createCase(deprecatedUser, {
        title: 'case_2_a_deprecated_one',
        owner: 'cases_owner_one',
      });
      const caseTwoDeprecated = await createCase(deprecatedUser, {
        title: 'case_2_a_deprecated_two',
        owner: 'cases_owner_two',
      });

      // Create cases as user with transformed privileges (should be able to create cases for both
      // owners).
      const transformedUser = getUserCredentials('case_2_a_transformed');
      const caseOneTransformed = await createCase(transformedUser, {
        title: 'case_2_a_transformed_one',
        owner: 'cases_owner_one',
      });
      const caseTwoTransformed = await createCase(transformedUser, {
        title: 'case_2_a_transformed_two',
        owner: 'cases_owner_two',
      });

      // Create cases as user with new privileges (B).
      const newUserB = getUserCredentials('case_2_b_new');
      const caseOneNewB = await createCase(newUserB, {
        title: 'case_2_b_new_one',
        owner: 'cases_owner_one',
      });

      // Create cases as user with new privileges (C).
      const newUserC = getUserCredentials('case_2_c_new');
      const caseTwoNewC = await createCase(newUserC, {
        title: 'case_2_c_new_two',
        owner: 'cases_owner_two',
      });

      // Users with deprecated and transformed privileges should have the same privilege level and
      // be able to access cases created by themselves and users with new privileges.
      for (const caseToCheck of [
        caseOneDeprecated,
        caseTwoDeprecated,
        caseOneTransformed,
        caseTwoTransformed,
        caseOneNewB,
        caseTwoNewC,
      ]) {
        expect(await getCase(deprecatedUser, caseToCheck.id)).toBeDefined();
        expect(await getCase(transformedUser, caseToCheck.id)).toBeDefined();
      }

      // User B and User C should be able to access cases created by themselves and users with
      // deprecated and transformed privileges, but only for the specific owner.
      for (const caseToCheck of [caseOneDeprecated, caseOneTransformed, caseOneNewB]) {
        expect(await getCase(newUserB, caseToCheck.id)).toBeDefined();
        expect(await getCase(newUserC, caseToCheck.id)).toBeUndefined();
      }
      for (const caseToCheck of [caseTwoDeprecated, caseTwoTransformed, caseTwoNewC]) {
        expect(await getCase(newUserC, caseToCheck.id)).toBeDefined();
        expect(await getCase(newUserB, caseToCheck.id)).toBeUndefined();
      }
    });

    it('Alerting privileges are properly handled for deprecated privileges', async () => {
      const createRule = async (
        authorization: string,
        name: string,
        consumer: string,
        ruleType: string
      ): Promise<{ id: string }> => {
        const { body: newRule } = await supertestWithoutAuth
          .post('/api/alerting/rule')
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .send({
            enabled: true,
            name,
            tags: ['foo'],
            rule_type_id: ruleType,
            consumer,
            schedule: { interval: '24h' },
            throttle: undefined,
            notify_when: undefined,
            actions: [],
            params: {},
          })
          .expect(200);
        return newRule;
      };

      const getRule = async (authorization: string, ruleId: string): Promise<unknown> => {
        const { body } = await supertestWithoutAuth
          .get(`/api/alerting/rules/_find`)
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return body.data.find((r: { id: string }) => r.id === ruleId);
      };

      // Create rules as user with deprecated privilege.
      const deprecatedUser = getUserCredentials('case_2_a_deprecated');
      const ruleOneDeprecated = await createRule(
        deprecatedUser,
        'case_2_a_deprecated_one',
        'case_2_feature_a',
        'alerting_rule_type_one'
      );
      const ruleTwoDeprecated = await createRule(
        deprecatedUser,
        'case_2_a_deprecated_two',
        'case_2_feature_a',
        'alerting_rule_type_two'
      );

      // Create rules as user with transformed privileges (should be able to create rules for both
      // owners).
      const transformedUser = getUserCredentials('case_2_a_transformed');
      const ruleOneTransformed = await createRule(
        transformedUser,
        'case_2_a_transform_one',
        'case_2_feature_a',
        'alerting_rule_type_one'
      );
      const ruleTwoTransformed = await createRule(
        transformedUser,
        'case_2_a_transform_two',
        'case_2_feature_a',
        'alerting_rule_type_two'
      );

      // Create rules as user with new privileges (B).
      const newUserB = getUserCredentials('case_2_b_new');
      const ruleOneNewBConsumerA = await createRule(
        newUserB,
        'case_2_b_new_one',
        'case_2_feature_a',
        'alerting_rule_type_one'
      );
      const ruleOneNewBConsumerB = await createRule(
        newUserB,
        'case_2_b_new_one',
        'case_2_feature_b',
        'alerting_rule_type_one'
      );

      // Create cases as user with new privileges (C).
      const newUserC = getUserCredentials('case_2_c_new');
      const ruleTwoNewCConsumerA = await createRule(
        newUserC,
        'case_2_c_new_two',
        'case_2_feature_a',
        'alerting_rule_type_two'
      );
      const ruleTwoNewCConsumerC = await createRule(
        newUserC,
        'case_2_c_new_two',
        'case_2_feature_c',
        'alerting_rule_type_two'
      );

      // Users with deprecated privileges should be able to access rules created by themselves and
      // users with new privileges assuming the consumer is the same.
      for (const ruleToCheck of [
        ruleOneDeprecated,
        ruleTwoDeprecated,
        ruleOneTransformed,
        ruleTwoTransformed,
        ruleOneNewBConsumerA,
        ruleTwoNewCConsumerA,
      ]) {
        expect(await getRule(deprecatedUser, ruleToCheck.id)).toBeDefined();
        expect(await getRule(transformedUser, ruleToCheck.id)).toBeDefined();
      }

      // Any new consumer that is not known to the deprecated feature shouldn't be available to the
      // users with the deprecated privileges unless deprecated features are update to explicitly
      // support new consumers.
      for (const ruleToCheck of [ruleOneNewBConsumerB, ruleTwoNewCConsumerC]) {
        expect(await getRule(deprecatedUser, ruleToCheck.id)).toBeUndefined();
        expect(await getRule(transformedUser, ruleToCheck.id)).toBeDefined();
      }

      // User B and User C should be able to access rule types created by themselves and users with
      // deprecated and transformed privileges, but only for the specific consumer.
      for (const ruleToCheck of [
        ruleOneDeprecated,
        ruleOneTransformed,
        ruleOneNewBConsumerA,
        ruleOneNewBConsumerB,
      ]) {
        expect(await getRule(newUserB, ruleToCheck.id)).toBeDefined();
        expect(await getRule(newUserC, ruleToCheck.id)).toBeUndefined();
      }
      for (const ruleToCheck of [
        ruleTwoDeprecated,
        ruleTwoTransformed,
        ruleTwoNewCConsumerA,
        ruleTwoNewCConsumerC,
      ]) {
        expect(await getRule(newUserC, ruleToCheck.id)).toBeDefined();
        expect(await getRule(newUserB, ruleToCheck.id)).toBeUndefined();
      }
    });
  });
}
