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
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');
  const log = getService('log');

  describe('@ess @serverless Endpoint artifacts (via lists plugin): Endpoint Exceptions', function () {
    let endpointOpsAnalystSupertest: TestAgent;

    before(async () => {
      endpointOpsAnalystSupertest = await utils.createSuperTest(ROLE.endpoint_operations_analyst);
    });

    describe(`and using Import API`, function () {
      const buildImportBuffer = (
        listId: (typeof ALL_ENDPOINT_ARTIFACT_LIST_IDS)[number]
      ): Buffer => {
        const generator = new ExceptionsListItemGenerator();
        const listInfo = Object.values(ENDPOINT_ARTIFACT_LISTS).find((listDefinition) => {
          return listDefinition.id === listId;
        });

        if (!listInfo) {
          throw new Error(`Unknown listId: ${listId}. Unable to generate exception list item.`);
        }

        const createItem = () => {
          switch (listId) {
            case ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id:
              return generator.generateEndpointException();

            case ENDPOINT_ARTIFACT_LISTS.blocklists.id:
              return generator.generateBlocklist();

            case ENDPOINT_ARTIFACT_LISTS.eventFilters.id:
              return generator.generateEventFilter();

            case ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id:
              return generator.generateHostIsolationException();

            case ENDPOINT_ARTIFACT_LISTS.trustedApps.id:
              return generator.generateTrustedApp();

            case ENDPOINT_ARTIFACT_LISTS.trustedDevices.id:
              return generator.generateTrustedDevice();

            default:
              throw new Error(`Unknown listId: ${listId}. Unable to generate exception list item.`);
          }
        };

        return Buffer.from(
          `
{"_version":"WzEsMV0=","created_at":"2025-08-21T14:20:07.012Z","created_by":"kibana","description":"${
            listInfo!.description
          }","id":"${listId}","immutable":false,"list_id":"${listId}","name":"${
            listInfo!.name
          }","namespace_type":"agnostic","os_types":[],"tags":[],"tie_breaker_id":"034d07f4-fa33-43bb-adfa-6f6bda7921ce","type":"endpoint","updated_at":"2025-08-21T14:20:07.012Z","updated_by":"kibana","version":1}
${JSON.stringify(createItem())}
${JSON.stringify(createItem())}
${JSON.stringify(createItem())}
{"exported_exception_list_count":1,"exported_exception_list_item_count":3,"missing_exception_list_item_count":0,"missing_exception_list_items":[],"missing_exception_lists":[],"missing_exception_lists_count":0}
`,
          'utf8'
        );
      };

      // All non-Endpoint exceptions artifacts are not allowed to import
      ALL_ENDPOINT_ARTIFACT_LIST_IDS.filter(
        (listId) => listId !== ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
      ).forEach((listId) => {
        it(`should error when importing ${listId} artifacts`, async () => {
          await endpointArtifactTestResources.deleteList(listId);

          const { body } = await endpointOpsAnalystSupertest
            .post(`${EXCEPTION_LIST_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([400]))
            .attach('file', buildImportBuffer(listId), 'import_data.ndjson')
            .expect(400);

          expect(body.message).to.eql(
            'EndpointArtifactError: Import is not supported for Endpoint artifact exceptions'
          );
        });
      });

      it('should import endpoint exceptions and add global artifact tag if missing', async () => {
        await endpointArtifactTestResources.deleteList(
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        );

        await endpointOpsAnalystSupertest
          .post(`${EXCEPTION_LIST_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .attach(
            'file',
            buildImportBuffer(ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id),
            'import_exceptions.ndjson'
          )
          .expect(200);

        const { body } = await endpointOpsAnalystSupertest
          .get(`${EXCEPTION_LIST_ITEM_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .query({
            list_id: 'endpoint_list',
            namespace_type: 'agnostic',
            per_page: 50,
          })
          .send()
          .expect(200);

        // After import - all items should be returned on a GET `find` request.
        expect(body.data.length).to.eql(3);

        for (const endpointException of body.data) {
          expect(endpointException.tags).to.include.string(GLOBAL_ARTIFACT_TAG);
        }
      });
    });
  });
}
