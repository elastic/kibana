/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import { CUSTOM_YARA_SIGNATURES_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/custom_yara_signatures/constants';
import type TestAgent from 'supertest/lib/agent';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const kibanaServer = getService('kibanaServer');
  const utils = getService('securitySolutionUtils');

  // @skipInServerlessMKI - Custom YARA signatures require Enterprise/Complete; this suite asserts denial on Basic/Essentials
  describe('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Custom YARA Signatures - No License', function () {
    this.tags('skipFIPS');

    const exceptionsGenerator = new ExceptionsListItemGenerator();
    let adminSupertest: TestAgent;
    let seededArtifact: {
      id: string;
      item_id: string;
      list_id: string;
      namespace_type: string;
      _version: string;
    };

    interface YaraSignatureApiCallInterface<BodyReturnType = object> {
      method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
      info: string;
      path: string;
      getBody?: () => BodyReturnType;
      getFile?: () => [string, Buffer, string];
    }

    before(async () => {
      adminSupertest = await utils.createSuperTest();
      await endpointArtifactTestResources.ensureListExists(CUSTOM_YARA_SIGNATURES_LIST_DEFINITION, {
        supertest: adminSupertest,
      });
    });

    beforeEach(async () => {
      // Seed a YARA item via saved objects so get/update/delete hit authz (API create is denied on this license/tier)
      const createPayload = exceptionsGenerator.generateCustomYaraSignatureForCreate({
        tags: [GLOBAL_ARTIFACT_TAG],
      });
      const dateNow = new Date().toISOString();
      const savedObject = await kibanaServer.savedObjects.create({
        type: 'exception-list-agnostic',
        overwrite: true,
        attributes: {
          comments: [],
          created_at: dateNow,
          created_by: 'elastic',
          description: createPayload.description ?? '',
          entries: createPayload.entries,
          item_id: createPayload.item_id,
          list_id: createPayload.list_id,
          list_type: 'item',
          name: createPayload.name,
          os_types: createPayload.os_types,
          tags: createPayload.tags,
          tie_breaker_id: createPayload.item_id,
          type: createPayload.type,
          updated_by: 'elastic',
        },
      });

      seededArtifact = {
        id: savedObject.id,
        item_id: createPayload.item_id,
        list_id: createPayload.list_id,
        namespace_type: 'agnostic',
        _version: savedObject.version ?? '',
      };
    });

    afterEach(async () => {
      if (seededArtifact?.id) {
        await kibanaServer.savedObjects
          .delete({ type: 'exception-list-agnostic', id: seededArtifact.id })
          .catch(() => undefined);
      }
    });

    after(async () => {
      await endpointArtifactTestResources.deleteList(
        ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id
      );
    });

    const apiCalls: YaraSignatureApiCallInterface[] = [
      {
        method: 'post',
        info: 'create single item',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateCustomYaraSignatureForCreate({
            tags: [GLOBAL_ARTIFACT_TAG],
          }),
      },
      {
        method: 'put',
        info: 'update single item',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateCustomYaraSignatureForUpdate({
            id: seededArtifact.id,
            item_id: seededArtifact.item_id,
            tags: [GLOBAL_ARTIFACT_TAG],
            _version: seededArtifact._version,
          }),
      },
      {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${seededArtifact.item_id}&namespace_type=${seededArtifact.namespace_type}`;
        },
      },
      {
        method: 'get',
        info: 'single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${seededArtifact.item_id}&namespace_type=${seededArtifact.namespace_type}`;
        },
      },
      {
        method: 'get',
        info: 'list summary',
        get path() {
          return `${EXCEPTION_LIST_URL}/summary?list_id=${seededArtifact.list_id}&namespace_type=${seededArtifact.namespace_type}`;
        },
      },
      {
        method: 'get',
        info: 'find items',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${seededArtifact.list_id}&namespace_type=${seededArtifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
        },
      },
      {
        method: 'post',
        info: 'list export',
        get path() {
          return `${EXCEPTION_LIST_URL}/_export?list_id=${seededArtifact.list_id}&namespace_type=${seededArtifact.namespace_type}&id=${seededArtifact.id}&include_expired_exceptions=true`;
        },
      },
      {
        method: 'post',
        info: 'import',
        get path() {
          return `${EXCEPTION_LIST_URL}/_import`;
        },
        getFile: () => [
          'file',
          exceptionsGenerator.generateImportBuffer(
            seededArtifact.list_id as (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number]
          ),
          'import_data.ndjson',
        ],
      },
    ];

    for (const apiCall of apiCalls) {
      it(`should return 403 on [${apiCall.method}] - [${apiCall.info}]`, async () => {
        const request = adminSupertest[apiCall.method](apiCall.path).set('kbn-xsrf', 'true');

        if (apiCall.getFile) {
          request.attach(...apiCall.getFile());
        }

        if (apiCall.getBody) {
          request.send(apiCall.getBody());
        }

        await request.expect(403, {
          status_code: 403,
          message: 'EndpointArtifactError: Endpoint authorization failure',
        });
      });
    }
  });
}
