/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';

import { CaseStatuses } from '@kbn/cases-components';
import type { Case, CasePatchRequest, CasePostRequest } from '@kbn/cases-plugin/common';
import { CaseSeverity, ConnectorTypes, FEATURE_ID, FEATURE_ID_V2 } from '@kbn/cases-plugin/common';
import type { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';
import type { Role } from '@kbn/security-plugin-types-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('cases feature migration', function () {
    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');

    before(async () => {
      await security.role.create('cases_v1_all', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { [FEATURE_ID]: ['all'] } }],
      });

      const { elasticsearch, kibana } = (await security.role.get('cases_v1_all', {
        replaceDeprecatedPrivileges: true,
      })) as Role;

      expect(kibana).toEqual([
        {
          spaces: ['*'],
          base: [],
          feature: {
            [FEATURE_ID_V2]: ['all'],
          },
        },
      ]);
      await security.role.create('cases_v1_transformed', { elasticsearch, kibana });

      await security.role.create('cases_v2_all', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { [FEATURE_ID_V2]: ['all'] } }],
      });

      await security.user.create('cases_v1_user', {
        password: 'changeme',
        roles: ['cases_v1_all'],
        full_name: 'Cases V1 User',
      });

      await security.user.create('cases_v1_transformed_user', {
        password: 'changeme',
        roles: ['cases_v1_transformed'],
        full_name: 'Cases V1 Transformed User',
      });

      await security.user.create('cases_v2_user', {
        password: 'changeme',
        roles: ['cases_v2_all'],
        full_name: 'Cases V2 User',
      });
    });

    after(async () => {
      await Promise.all([
        security.role.delete('cases_v1_all'),
        security.role.delete('cases_v1_transformed'),
        security.role.delete('cases_v2_all'),
        security.user.delete('cases_v1_user'),
        security.user.delete('cases_v1_transformed_user'),
        security.user.delete('cases_v2_user'),
      ]);

      const { body: cases } = await supertest
        .get(`/api/cases/_find`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const caseIds = (cases as CasesFindResponse).cases.map((c) => c.id);
      if (caseIds.length > 0) {
        await supertest
          .delete(`/api/cases`)
          .query({ ids: JSON.stringify(caseIds) })
          .set('kbn-xsrf', 'true')
          .expect(204);
      }
    });

    it('replaced UI capabilities are properly set for deprecated privileges', async () => {
      const { body: capabilities } = await supertestWithoutAuth
        .post('/api/core/capabilities')
        .set('Authorization', getUserCredentials('cases_v1_user'))
        .set('kbn-xsrf', 'xxx')
        .send({ applications: [] })
        .expect(200);

      expect(capabilities).toMatchObject({
        // V1
        [FEATURE_ID]: {
          read_cases: true,
          delete_cases: true,
          cases_settings: true,
          cases_connectors: true,
          create_cases: true,
          push_cases: true,
          update_cases: true,
        },
        // V2
        [FEATURE_ID_V2]: {
          create_comment: true,
          case_reopen: true,
          cases_connectors: true,
          cases_settings: true,
          create_cases: true,
          delete_cases: true,
          push_cases: true,
          read_cases: true,
          update_cases: true,
        },
      });
    });

    it('cases permissions are properly handled for deprecated privileges', async () => {
      const createCase = async (authorization: string): Promise<Case> => {
        const caseRequest: CasePostRequest = {
          description: 'Test case',
          title: 'Test Case',
          tags: ['test'],
          severity: CaseSeverity.LOW,
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          settings: { syncAlerts: false },
          owner: 'cases',
          assignees: [],
        };

        const { body: newCase } = await supertestWithoutAuth
          .post('/api/cases')
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .send(caseRequest)
          .expect(200);
        return newCase;
      };

      const v1User = getUserCredentials('cases_v1_user');
      const v1Case = await createCase(v1User);

      const v1TransformedUser = getUserCredentials('cases_v1_transformed_user');
      const v1TransformedCase = await createCase(v1TransformedUser);

      const v2User = getUserCredentials('cases_v2_user');
      const v2Case = await createCase(v2User);

      for (const testCase of [v1Case, v1TransformedCase, v2Case]) {
        // V1 user should have access through deprecated privileges
        const v1Response = await supertestWithoutAuth
          .get(`/api/cases/${testCase.id}`)
          .set('Authorization', v1User)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(v1Response.body.id).toBe(testCase.id);

        // Transformed user should have same access
        const transformedResponse = await supertestWithoutAuth
          .get(`/api/cases/${testCase.id}`)
          .set('Authorization', v1TransformedUser)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(transformedResponse.body.id).toBe(testCase.id);

        // V2 user should have access through new privileges
        const v2Response = await supertestWithoutAuth
          .get(`/api/cases/${testCase.id}`)
          .set('Authorization', v2User)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(v2Response.body.id).toBe(testCase.id);
      }
    });

    it('case update permissions are properly handled for deprecated privileges', async () => {
      const createCase = async (authorization: string): Promise<Case> => {
        const caseRequest: CasePostRequest = {
          description: 'Test case',
          title: 'Test Case',
          tags: ['test'],
          severity: CaseSeverity.LOW,
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          settings: { syncAlerts: false },
          owner: 'cases',
          assignees: [],
        };

        const { body: newCase } = await supertestWithoutAuth
          .post('/api/cases')
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .send(caseRequest)
          .expect(200);
        return newCase;
      };

      const updateCaseToClosed = async (authorization: string, caseId: string): Promise<Case> => {
        const updateRequest: CasePatchRequest = {
          status: CaseStatuses.closed,
          version: '1',
        };

        const { body: updatedCase } = await supertestWithoutAuth
          .patch(`/api/cases/${caseId}`)
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .send(updateRequest);
        return updatedCase;
      };

      const updateCaseToOpen = async (authorization: string, caseId: string): Promise<Case> => {
        const updateRequest: CasePatchRequest = {
          status: CaseStatuses.open, // Try to reopen the case
          version: '2', // Assuming this is first update
        };

        const { body: updatedCase } = await supertestWithoutAuth
          .patch(`/api/cases/${caseId}`)
          .set('Authorization', authorization)
          .set('kbn-xsrf', 'xxx')
          .send(updateRequest);
        return updatedCase;
      };

      const v1User = getUserCredentials('cases_v1_user');
      const v1Case = await createCase(v1User);

      const v1TransformedUser = getUserCredentials('cases_v1_transformed_user');
      const v1TransformedCase = await createCase(v1TransformedUser);

      const v2User = getUserCredentials('cases_v2_user');
      const v2Case = await createCase(v2User);

      const v1UpdateToClosed = await updateCaseToClosed(v1User, v1Case.id);
      expect(v1UpdateToClosed.status).toBe(CaseStatuses.CLOSED);
      const v1Update = await updateCaseToOpen(v1User, v1Case.id);
      expect(v1Update.status).toBe(CaseStatuses.OPEN);

      const transformedUpdateToClosed = await updateCaseToClosed(
        v1TransformedUser,
        v1TransformedCase.id
      );
      expect(transformedUpdateToClosed.status).toBe(CaseStatuses.CLOSED);
      const transformedUpdate = await updateCaseToOpen(v1TransformedUser, v1TransformedCase.id);
      expect(transformedUpdate.status).toBe(CaseStatuses.OPEN);

      const v2UpdateToClosed = await updateCaseToClosed(v2User, v2Case.id);
      expect(v2UpdateToClosed.status).toBe(CaseStatuses.CLOSED);
      const v2Update = await updateCaseToOpen(v2User, v2Case.id);
      expect(v2Update.status).toBe(CaseStatuses.OPEN);
    });
  });
}

function getUserCredentials(username: string) {
  return `Basic ${Buffer.from(`${username}:changeme`).toString('base64')}`;
}
