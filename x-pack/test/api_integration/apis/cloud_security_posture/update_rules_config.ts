/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { SuperTest, Test } from 'supertest';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { CspRule } from '@kbn/cloud-security-posture-plugin/common/schemas';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  CSP_RULE_SAVED_OBJECT_TYPE,
  UPDATE_RULES_CONFIG_ROUTE_PATH,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { packageToPackagePolicy } from '@kbn/fleet-plugin/common/services/package_to_package_policy';

const getNewPackagePolicy = (packageInfo: PackageInfo) =>
  packageToPackagePolicy(
    packageInfo,
    'policy2', // policy2 from 'x-pack/test/functional/es_archives/fleet/agents'
    'default',
    'cloud_security_posture-1'
  );

const installIntegration = async (supertest: SuperTest<Test>) => {
  const packageInfo = await getPackageInfo(supertest);
  return await supertest
    .post('/api/fleet/package_policies')
    .set('kbn-xsrf', 'xxxx')
    .send(getNewPackagePolicy(packageInfo))
    .expect(200)
    .then<PackagePolicy>((response) => response.body.item);
};

const getPackageInfo = (supertest: SuperTest<Test>) =>
  supertest
    .get(`/api/fleet/epm/packages/${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`)
    .set('kbn-xsrf', 'xxxx')
    .expect(200)
    .then<PackageInfo>((response) => response.body.item);

const getCspRulesSO = (supertest: SuperTest<Test>) =>
  supertest
    .get(`/api/saved_objects/_find?type=${CSP_RULE_SAVED_OBJECT_TYPE}`)
    .expect(200)
    .then<SavedObjectsFindResponse<CspRule>>((response) => response.body);

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('POST /internal/cloud_security_posture/update_rules_config', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    it('updates package policy vars with new rules configuration', async () => {
      const packagePolicy = await installIntegration(supertest);
      const currentRules = await getCspRulesSO(supertest);

      const ruleToDisable = currentRules.saved_objects[0];
      const ruleToEnable = currentRules.saved_objects[1];

      const { body: updatedPackagePolicy } = await supertest
        .post(UPDATE_RULES_CONFIG_ROUTE_PATH)
        .set('kbn-xsrf', 'xxxx')
        .send({
          package_policy_id: packagePolicy.id,
          rules: [
            { id: ruleToDisable.id, enabled: false },
            { id: ruleToEnable.id, enabled: true },
          ],
        })
        .expect(200);

      const runtimeCfgValue = updatedPackagePolicy.vars.runtimeCfg.value;

      expect(runtimeCfgValue).to.contain(ruleToEnable.attributes.metadata.rego_rule_id);
      expect(runtimeCfgValue).to.not.contain(ruleToDisable.attributes.metadata.rego_rule_id);
    });
  });
}
