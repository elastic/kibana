/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuid } from 'uuid';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type TestAgent from 'supertest/lib/agent';
import { createSupertestErrorLogger } from '../../../../edr_workflows/utils';
import { combineArrayToNdJson, getCustomQueryRuleParams, importRules } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { ROLE } from '../../../../../config/services/security_solution_edr_workflows_roles_users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');

  describe('@ess @serverless @skipInServerlessMKI import rules with endpoint response actions', () => {
    let superTestResponseActionsNoAuthz: TestAgent;
    let rulesToImport: unknown[];
    let ruleId: string;

    before(async () => {
      superTestResponseActionsNoAuthz = await utils.createSuperTestWithCustomRole({
        name: ROLE.endpoint_response_actions_no_access,
        privileges: rolesUsersProvider.loader.getPreDefinedRole(
          ROLE.endpoint_response_actions_no_access
        ),
      });
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      ruleId = uuid();
      rulesToImport = [
        getCustomQueryRuleParams({
          rule_id: ruleId,
          response_actions: [
            {
              action_type_id: '.endpoint',
              params: {
                command: 'suspend-process',
                config: { field: 'some-field', overwrite: false },
              },
            },
          ],
        }),
      ];
    });

    it('should import rules with response actions when user has authz', async () => {
      const importResponse = await importRules({
        getService,
        rules: rulesToImport,
        overwrite: false,
      });

      expect(importResponse).toMatchObject({
        success: true,
        success_count: 1,
        rules_count: 1,
        errors: [],
      });

      const { body } = await detectionsApi.readRule({ query: { rule_id: ruleId } }).expect(200);
      expect(body.response_actions[0].params.command).toBe('suspend-process');
    });

    it('should NOT import rules with response actions when user does NOT have authz', async () => {
      const fileBuffer = Buffer.from(combineArrayToNdJson(rulesToImport));

      const { body } = await superTestResponseActionsNoAuthz
        .post('/api/detection_engine/rules/_import')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
        .attach('file', fileBuffer, { filename: 'rules.ndjson' })
        .expect(200);

      expect(body).toMatchObject({
        success: false,
        success_count: 0,
        errors: [
          {
            error: {
              message: 'User is not authorized to create/update suspend-process response action',
              status_code: 403,
            },
            id: '',
            rule_id: ruleId,
          },
        ],
      });

      await detectionsApi.readRule({ query: { rule_id: ruleId } }).expect(404);
    });
  });
};
