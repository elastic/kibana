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
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { exceptionItemToCreateExceptionItem } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Role } from '@kbn/security-plugin-types-common';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { PolicyTestResourceInfo } from '../../../../../security_solution_endpoint/services/endpoint_policy';
import { createSupertestErrorLogger } from '../../utils';
import { ArtifactTestData } from '../../../../../security_solution_endpoint/services/endpoint_artifacts';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const policyTestResources = getService('endpointPolicyTestResources');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  // @skipInServerless: due to the fact that the serverless builtin roles are not yet updated with new privilege
  //                    and tests below are currently creating a new role/user
  describe('@ess @skipInServerless, @skipInServerlessMKI Endpoint Artifacts space awareness support', function () {
    const spaceOneId = 'space_one';
    const spaceTwoId = 'space_two';

    let artifactManagerRole: Role;
    let globalArtifactManagerRole: Role;
    let supertestArtifactManager: TestAgent;
    let supertestGlobalArtifactManager: TestAgent;
    let spaceOnePolicy: PolicyTestResourceInfo;

    before(async () => {
      // For testing, we're using the `t3_analyst` role which already has All privileges
      // to all artifacts and manipulating that role definition to create two new roles/users
      artifactManagerRole = Object.assign(
        rolesUsersProvider.loader.getPreDefinedRole('t3_analyst'),
        { name: 'artifactManager' }
      );

      if (artifactManagerRole.kibana[0].feature.siemV2.includes('global_artifact_management_all')) {
        artifactManagerRole.kibana[0].feature.siemV2 =
          artifactManagerRole.kibana[0].feature.siemV2.filter(
            (privilege) => privilege !== 'global_artifact_management_all'
          );
      }

      globalArtifactManagerRole = Object.assign(
        rolesUsersProvider.loader.getPreDefinedRole('t3_analyst'),
        { name: 'globalArtifactManager' }
      );

      if (
        !globalArtifactManagerRole.kibana[0].feature.siemV2.includes(
          'global_artifact_management_all'
        )
      ) {
        globalArtifactManagerRole.kibana[0].feature.siemV2.push('global_artifact_management_all');
      }

      const [artifactManagerUser, globalArtifactManagerUser] = await Promise.all([
        rolesUsersProvider.loader.create(artifactManagerRole),
        rolesUsersProvider.loader.create(globalArtifactManagerRole),
      ]);

      supertestArtifactManager = await utils.createSuperTest(
        artifactManagerUser.username,
        artifactManagerUser.password
      );
      supertestGlobalArtifactManager = await utils.createSuperTest(
        globalArtifactManagerUser.username,
        globalArtifactManagerUser.password
      );

      await Promise.all([
        ensureSpaceIdExists(kbnServer, spaceOneId, { log }),
        ensureSpaceIdExists(kbnServer, spaceTwoId, { log }),
      ]);

      spaceOnePolicy = await policyTestResources.createPolicy();
    });

    // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
    // to do it manually
    after(async () => {
      if (artifactManagerRole) {
        await rolesUsersProvider.loader.delete(artifactManagerRole.name);
        // @ts-expect-error
        artifactManagerRole = undefined;
      }

      if (globalArtifactManagerRole) {
        await rolesUsersProvider.loader.delete(globalArtifactManagerRole.name);
        // @ts-expect-error
        globalArtifactManagerRole = undefined;
      }

      if (spaceOnePolicy) {
        await spaceOnePolicy.cleanup();
        // @ts-expect-error
        spaceOnePolicy = undefined;
      }
    });

    const artifactLists = Object.keys(ENDPOINT_ARTIFACT_LISTS);

    for (const artifactList of artifactLists) {
      const listInfo =
        ENDPOINT_ARTIFACT_LISTS[artifactList as keyof typeof ENDPOINT_ARTIFACT_LISTS];

      describe(`for ${listInfo.name}`, () => {
        let spaceOnePerPolicyArtifact: ArtifactTestData;
        let spaceOneGlobalArtifact: ArtifactTestData;

        beforeEach(async () => {
          spaceOnePerPolicyArtifact = await endpointArtifactTestResources.createArtifact(
            listInfo.id,
            { tags: [buildPerPolicyTag(spaceOnePolicy.packagePolicy.id)] },
            { supertest: supertestArtifactManager, spaceId: spaceOneId }
          );

          spaceOneGlobalArtifact = await endpointArtifactTestResources.createArtifact(
            listInfo.id,
            { tags: [GLOBAL_ARTIFACT_TAG] },
            { supertest: supertestGlobalArtifactManager, spaceId: spaceOneId }
          );
        });

        afterEach(async () => {
          if (spaceOnePerPolicyArtifact) {
            await spaceOnePerPolicyArtifact.cleanup();
            // @ts-expect-error assigning `undefined`
            spaceOnePerPolicyArtifact = undefined;
          }
        });

        it('should add owner space id when item is created', async () => {
          expect(spaceOnePerPolicyArtifact.artifact.tags).to.include.string(
            buildSpaceOwnerIdTag(spaceOneId)
          );
        });

        it('should not add owner space id during artifact update if one is already present', async () => {
          const { body } = await supertestArtifactManager
            .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
            .set('elastic-api-version', '2023-10-31')
            .set('x-elastic-internal-origin', 'kibana')
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .send(
              exceptionItemToCreateExceptionItem({
                ...spaceOnePerPolicyArtifact.artifact,
                description: 'item was updated',
              })
            )
            .expect(200);

          expect((body as ExceptionListItemSchema).tags).to.eql(
            spaceOnePerPolicyArtifact.artifact.tags
          );
        });

        describe('and user does NOT have global artifact management privilege', () => {
          it('should error when attempting to create artifact with additional owner space id tags', async () => {
            await supertestArtifactManager
              .post(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .send(
                Object.assign(
                  exceptionItemToCreateExceptionItem({
                    ...spaceOnePerPolicyArtifact.artifact,
                    tags: [buildSpaceOwnerIdTag('foo')],
                  }),
                  { item_id: undefined }
                )
              )
              .expect(403);
          });

          it('should error when attempting to update artifact with different owner space id tags', async () => {
            await supertestArtifactManager
              .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOnePerPolicyArtifact.artifact,
                  tags: [buildSpaceOwnerIdTag('foo')],
                })
              )
              .expect(403);
          });

          it('should error if attempting to update a global artifact', async () => {
            await supertestArtifactManager
              .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOneGlobalArtifact.artifact,
                  description: 'updating a global here',
                })
              )
              .expect(403);
          });

          it('should error when attempting to change a global artifact to per-policy', async () => {
            await supertestArtifactManager
              .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOneGlobalArtifact.artifact,
                  tags: spaceOneGlobalArtifact.artifact.tags
                    .filter((tag) => tag !== GLOBAL_ARTIFACT_TAG)
                    .concat(buildPerPolicyTag(spaceOnePolicy.packagePolicy.id)),
                })
              )
              .expect(403);
          });

          it('should error when attempting to update item outside of its owner space id', async () => {
            const { body } = await supertestArtifactManager
              .put(addSpaceIdToPath('/', spaceTwoId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOnePerPolicyArtifact.artifact,
                  description: 'updating item',
                })
              )
              .expect(403);

            expect(body.message).to.eql(
              `EndpointArtifactError: Updates to this shared item can only be done from the following space ID: ${spaceOneId} (or by someone having global artifact management privilege)`
            );
          });

          it('should error when attempting to delete item outside of its owner space id', async () => {
            const { body } = await supertestArtifactManager
              .delete(addSpaceIdToPath('/', spaceTwoId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .query({
                item_id: spaceOnePerPolicyArtifact.artifact.item_id,
                namespace_type: spaceOnePerPolicyArtifact.artifact.namespace_type,
              })
              .send()
              .expect(403);

            expect(body.message).to.eql(
              `EndpointArtifactError: Updates to this shared item can only be done from the following space ID: ${spaceOneId} (or by someone having global artifact management privilege)`
            );
          });
        });

        describe('and user has privilege to manage global artifacts', () => {
          it('should allow creating artifact with additional owner space id tags', async () => {
            const { body } = await supertestGlobalArtifactManager
              .post(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                Object.assign(
                  exceptionItemToCreateExceptionItem({
                    ...spaceOnePerPolicyArtifact.artifact,
                    tags: [buildSpaceOwnerIdTag('foo')],
                  }),
                  { item_id: undefined }
                )
              )
              .expect(200);

            expect((body as ExceptionListItemSchema).tags).to.eql([
              buildSpaceOwnerIdTag('foo'),
              buildSpaceOwnerIdTag(spaceOneId),
            ]);
          });

          it('should add owner space id when item is updated without having an owner tag', async () => {
            const { body } = await supertestGlobalArtifactManager
              .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOnePerPolicyArtifact.artifact,
                  tags: [],
                })
              )
              .expect(200);

            expect((body as ExceptionListItemSchema).tags).to.eql([
              buildSpaceOwnerIdTag(spaceOneId),
            ]);
          });

          it('should allow creation of global artifacts', async () => {
            // test is already covered by the fact that we created a global artifact for testing
            expect(spaceOneGlobalArtifact.artifact).to.not.equal(undefined);
          });

          it('should allow updating of global artifacts', async () => {
            await supertestGlobalArtifactManager
              .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOneGlobalArtifact.artifact,
                  description: 'updating of global artifacts',
                })
              )
              .expect(200);
          });

          it('should allow converting global artifact to per-policy', async () => {
            await supertestGlobalArtifactManager
              .put(addSpaceIdToPath('/', spaceOneId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOneGlobalArtifact.artifact,
                  tags: spaceOneGlobalArtifact.artifact.tags
                    .filter((tag) => tag !== GLOBAL_ARTIFACT_TAG)
                    .concat(buildPerPolicyTag(spaceOnePolicy.packagePolicy.id)),
                })
              )
              .expect(200);
          });

          it('should allow updating items outside of their owner space ids', async () => {
            await supertestGlobalArtifactManager
              .put(addSpaceIdToPath('/', spaceTwoId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log))
              .send(
                exceptionItemToCreateExceptionItem({
                  ...spaceOneGlobalArtifact.artifact,
                  description: 'updated from outside of its own space id',
                })
              )
              .expect(200);
          });

          it('should allow deleting items outside of their owner space ids', async () => {
            await supertestGlobalArtifactManager
              .delete(addSpaceIdToPath('/', spaceTwoId, EXCEPTION_LIST_ITEM_URL))
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin', 'kibana')
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
              .query({
                item_id: spaceOnePerPolicyArtifact.artifact.item_id,
                namespace_type: spaceOnePerPolicyArtifact.artifact.namespace_type,
              })
              .send()
              .expect(200);

            // @ts-expect-error
            spaceOnePerPolicyArtifact = undefined;
          });
        });
      });
    }
  });
}
