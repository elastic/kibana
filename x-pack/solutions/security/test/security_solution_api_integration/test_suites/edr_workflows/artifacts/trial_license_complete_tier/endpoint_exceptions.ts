/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
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
      beforeEach(async () => {
        await endpointArtifactTestResources.deleteList('endpoint_list');
      });

      it('should import endpoint exceptions and add global artifact tag if missing', async () => {
        const importDataBuffer: Buffer = Buffer.from(
          `
{"_version":"WzEsMV0=","created_at":"2025-08-21T14:20:07.012Z","created_by":"kibana","description":"Endpoint Security Exception List","id":"endpoint_list","immutable":false,"list_id":"endpoint_list","name":"Endpoint Security Exception List","namespace_type":"agnostic","os_types":[],"tags":[],"tie_breaker_id":"034d07f4-fa33-43bb-adfa-6f6bda7921ce","type":"endpoint","updated_at":"2025-08-21T14:20:07.012Z","updated_by":"kibana","version":1}
{"_version":"WzQyODIsMV0=","comments":[],"created_at":"2025-08-26T19:43:06.080Z","created_by":"elastic","description":"Exception list item","entries":[{"type":"match","field":"@timestamp","value":"4","operator":"included"}],"id":"87cc9dd1-1bf3-4c05-a09f-3bb04f36ac8e","item_id":"87cc9dd1-1bf3-4c05-a09f-3bb04f36ac8e","list_id":"endpoint_list","name":"three","namespace_type":"agnostic","os_types":["windows"],"tags":["policy:all"],"tie_breaker_id":"959e5832-7505-4835-8e92-98d0f5d1ffef","type":"simple","updated_at":"2025-08-26T19:43:06.080Z","updated_by":"elastic"}
{"_version":"WzQyODAsMV0=","comments":[],"created_at":"2025-08-26T19:42:36.182Z","created_by":"elastic","description":"Exception list item","entries":[{"type":"match","field":"@timestamp","value":"1","operator":"included"}],"id":"4707f48a-79e0-43a6-a4a5-3eb923fc192a","item_id":"4707f48a-79e0-43a6-a4a5-3eb923fc192a","list_id":"endpoint_list","name":"one","namespace_type":"agnostic","os_types":["macos"],"tags":[],"tie_breaker_id":"d2505730-fd9e-434b-a3e1-1b9ce141da79","type":"simple","updated_at":"2025-08-26T19:42:36.182Z","updated_by":"elastic"}
{"_version":"WzQyODEsMV0=","comments":[],"created_at":"2025-08-26T19:42:47.024Z","created_by":"elastic","description":"Exception list item","entries":[{"type":"match","field":"@timestamp","value":"2","operator":"included"}],"id":"a813960d-9c0b-4360-be30-b801c419b3a4","item_id":"a813960d-9c0b-4360-be30-b801c419b3a4","list_id":"endpoint_list","name":"two","namespace_type":"agnostic","os_types":["linux"],"tags":[],"tie_breaker_id":"efb08bff-cc34-4324-8df0-fa1af60f2ea7","type":"simple","updated_at":"2025-08-26T19:42:47.024Z","updated_by":"elastic"}
{"exported_exception_list_count":1,"exported_exception_list_item_count":3,"missing_exception_list_item_count":0,"missing_exception_list_items":[],"missing_exception_lists":[],"missing_exception_lists_count":0}
`,
          'utf8'
        );

        await endpointOpsAnalystSupertest
          .post(`${EXCEPTION_LIST_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .attach('file', importDataBuffer, 'import_exceptions.ndjson')
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

        expect(body.data.length).to.eql(3);
      });
    });
  });
}
