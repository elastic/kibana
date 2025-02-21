/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
} from '@kbn/securitysolution-list-constants';
import expect from '@kbn/expect';
import { buildSpaceOwnerIdTag } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { exceptionItemToCreateExceptionItem } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { createSupertestErrorLogger } from '../../utils';
import { ArtifactTestData } from '../../../../../security_solution_endpoint/services/endpoint_artifacts';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointTestresources = getService('endpointTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Endpoint Artifacts space awareness support', function () {
    let adminSupertest: TestAgent;
    let dataSpaceA: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;
    let dataSpaceB: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;

    before(async () => {
      adminSupertest = await utils.createSuperTest();

      await Promise.all([
        ensureSpaceIdExists(kbnServer, 'space_a', { log }),
        ensureSpaceIdExists(kbnServer, 'space_b', { log }),
      ]);

      dataSpaceA = await endpointTestresources.loadEndpointData({
        spaceId: 'space_a',
        generatorSeed: Math.random().toString(32),
      });

      dataSpaceB = await endpointTestresources.loadEndpointData({
        spaceId: 'space_b',
        generatorSeed: Math.random().toString(32),
      });

      log.verbose(
        `mocked data loaded:\nSPACE A:\n${JSON.stringify(
          dataSpaceA,
          null,
          2
        )}\nSPACE B:\n${JSON.stringify(dataSpaceB, null, 2)}`
      );
    });

    // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
    // to do it manually
    after(async () => {
      if (dataSpaceA) {
        await dataSpaceA.unloadEndpointData();
        // @ts-expect-error
        dataSpaceA = undefined;
      }
      if (dataSpaceB) {
        await dataSpaceB.unloadEndpointData();
        // @ts-expect-error
        dataSpaceB = undefined;
      }
    });

    describe(`Artifact management (via Lists plugin)`, () => {
      const artifactLists = Object.keys(ENDPOINT_ARTIFACT_LISTS);

      for (const artifactList of artifactLists) {
        const listInfo =
          ENDPOINT_ARTIFACT_LISTS[artifactList as keyof typeof ENDPOINT_ARTIFACT_LISTS];

        describe(`for ${listInfo.name}`, () => {
          let itemDataSpaceA: ArtifactTestData;

          beforeEach(async () => {
            itemDataSpaceA = await endpointArtifactTestResources.createArtifact(
              listInfo.id,
              { tags: [] },
              { supertest: adminSupertest, spaceId: dataSpaceA.spaceId }
            );
          });

          afterEach(async () => {
            if (itemDataSpaceA) {
              await itemDataSpaceA.cleanup();
              // @ts-expect-error assigning `undefined`
              itemDataSpaceA = undefined;
            }
          });

          it('should add owner space id when item is created', async () => {
            expect(itemDataSpaceA.artifact.tags).to.include.string(
              buildSpaceOwnerIdTag(dataSpaceA.spaceId)
            );
          });

          it('should not add owner space id during artifact update if one is already present', async () => {
            const { body } = await adminSupertest
              .put(addSpaceIdToPath('/', dataSpaceA.spaceId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...itemDataSpaceA.artifact,
                  description: 'item was updated',
                })
              )
              .expect(200);

            expect((body as ExceptionListItemSchema).tags).to.eql(itemDataSpaceA.artifact.tags);
          });

          it('should add owner space id when item is updated, if one is not present', async () => {
            const { body } = await adminSupertest
              .put(addSpaceIdToPath('/', dataSpaceA.spaceId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...itemDataSpaceA.artifact,
                  tags: [],
                })
              )
              .expect(200);

            expect((body as ExceptionListItemSchema).tags).to.eql([
              buildSpaceOwnerIdTag(dataSpaceA.spaceId),
            ]);
          });
        });
      }
    });
  });
}
