/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import {
  ALL_ENDPOINT_ARTIFACT_LIST_IDS,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type {
  ExportExceptionDetails,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { createSupertestErrorLogger } from '../../utils';

export default function artifactImportAPIIntegrationTests({ getService }: FtrProviderContext) {
  const log = getService('log');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @skipInServerlessMKI Import Endpoint artifacts API', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let endpointOpsAnalystSupertest: TestAgent;

    before(async () => {
      endpointOpsAnalystSupertest = await utils.createSuperTest(ROLE.endpoint_operations_analyst);

      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
    });

    const buildImportBuffer = (
      listId: (typeof ALL_ENDPOINT_ARTIFACT_LIST_IDS)[number],
      tags: string[] = []
    ): Buffer => {
      const generator = new ExceptionsListItemGenerator();
      const listInfo = Object.values(ENDPOINT_ARTIFACT_LISTS).find((listDefinition) => {
        return listDefinition.id === listId;
      });

      if (!listInfo) {
        throw new Error(`Unknown listId: ${listId}. Unable to generate exception list item.`);
      }

      const details: ExportExceptionDetails = {
        exported_exception_list_count: 1,
        exported_exception_list_item_count: 3,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
      };

      const item1 = generator.generateItem(listId, { tags });
      const item2 = generator.generateItem(listId, { tags });
      const item3 = generator.generateItem(listId, { tags });

      return Buffer.from(
        `
      {"_version":"WzEsMV0=","created_at":"2025-08-21T14:20:07.012Z","created_by":"kibana","description":"${
        listInfo.description
      }","id":"${listId}","immutable":false,"list_id":"${listId}","name":"${
          listInfo.name
        }","namespace_type":"agnostic","os_types":[],"tags":[],"tie_breaker_id":"034d07f4-fa33-43bb-adfa-6f6bda7921ce","type":"endpoint","updated_at":"2025-08-21T14:20:07.012Z","updated_by":"kibana","version":1}
      ${JSON.stringify(item1)}
      ${JSON.stringify(item2)}
      ${JSON.stringify(item3)}
      ${JSON.stringify(details)}
      `,
        'utf8'
      );
    };

    describe('Endpoint exceptions move feature flag enabled', () => {
      ALL_ENDPOINT_ARTIFACT_LIST_IDS.forEach((listId) => {
        it(`should import ${listId} artifacts`, async () => {
          await endpointArtifactTestResources.deleteList(listId);

          const expectedResponse: ImportExceptionsResponseSchema = {
            errors: [],
            success: true,
            success_count: 4,
            success_exception_lists: true,
            success_count_exception_lists: 1,
            success_exception_list_items: true,
            success_count_exception_list_items: 3,
          };

          await endpointOpsAnalystSupertest
            .post(`${EXCEPTION_LIST_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .attach('file', buildImportBuffer(listId, [GLOBAL_ARTIFACT_TAG]), 'import_data.ndjson')
            .expect(200)
            .expect(expectedResponse);

          const { body } = await endpointOpsAnalystSupertest
            .get(`${EXCEPTION_LIST_ITEM_URL}/_find`)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .query({
              list_id: listId,
              namespace_type: 'agnostic',
            })
            .send()
            .expect(200);

          expect(body.data.length).to.eql(3);

          await endpointArtifactTestResources.deleteList(listId);
        });
      });
    });
  });
}
