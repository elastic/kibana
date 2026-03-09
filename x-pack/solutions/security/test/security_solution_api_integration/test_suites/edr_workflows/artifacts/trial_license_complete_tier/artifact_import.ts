/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type TestAgent from 'supertest/lib/agent';
import expect from 'expect';
import {
  ENDPOINT_ARTIFACT_LISTS,
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type {
  ExceptionListItemSchema,
  ExportExceptionDetails,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import { SECURITY_FEATURE_ID, RULES_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/utils';
import type { FeaturesPrivileges } from '@kbn/security-plugin-types-common';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import type {
  ExceptionListItem,
  FindExceptionListItemsRequestQueryInput,
  FindExceptionListItemsResponse,
} from '@kbn/securitysolution-exceptions-common/api';
import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { addSpaceIdToPath } from '@kbn/spaces-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CustomRole } from '../../../../config/services/types';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { createSupertestErrorLogger } from '../../utils';

const ENDPOINT_ARTIFACTS: {
  listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number];
  name: string;
  read: string;
  all: string;
}[] = [
  {
    listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
    name: 'Endpoint Exceptions',
    read: 'endpoint_exceptions_read',
    all: 'endpoint_exceptions_all',
  },
  {
    listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
    name: 'Trusted Applications',
    read: 'trusted_applications_read',
    all: 'trusted_applications_all',
  },
  {
    listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
    name: 'Event Filters',
    read: 'event_filters_read',
    all: 'event_filters_all',
  },
  {
    listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
    name: 'Host Isolation Exceptions',
    read: 'host_isolation_exceptions_read',
    all: 'host_isolation_exceptions_all',
  },
  {
    listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
    name: 'Blocklist',
    read: 'blocklist_read',
    all: 'blocklist_all',
  },
  {
    listId: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
    name: 'Trusted Devices',
    read: 'trusted_devices_read',
    all: 'trusted_devices_all',
  },
];

export default function artifactImportAPIIntegrationTests({ getService }: FtrProviderContext) {
  const log = getService('log');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const kbnServer = getService('kibanaServer');

  const IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED = (
    config.get('kbnTestServer.serverArgs', []) as string[]
  )
    .find((s) => s.startsWith('--xpack.securitySolution.enableExperimental'))
    ?.includes('endpointExceptionsMovedUnderManagement');

  const createSupertestWithCustomRole = async (...roleParameters: Parameters<typeof buildRole>) =>
    utils.createSuperTestWithCustomRole(buildRole(...roleParameters));

  describe('@ess @serverless @skipInServerlessMKI Import Endpoint artifacts API', function () {
    const CURRENT_SPACE_ID = 'default';
    const OTHER_SPACE_ID = 'other-space';
    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let fleetEndpointPolicyOtherSpace: PolicyTestResourceInfo;
    let endpointOpsAnalystSupertest: TestAgent;

    before(async () => {
      await ensureSpaceIdExists(kbnServer, OTHER_SPACE_ID, { log });

      endpointOpsAnalystSupertest = await utils.createSuperTest(ROLE.endpoint_operations_analyst);

      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
      fleetEndpointPolicyOtherSpace = await endpointPolicyTestResources.createPolicy({
        options: { spaceId: OTHER_SPACE_ID },
      });
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
      if (fleetEndpointPolicyOtherSpace) {
        await fleetEndpointPolicyOtherSpace.cleanup();
      }
    });

    if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
      describe('Endpoint exceptions move feature flag enabled', () => {
        const CURRENT_SPACE_OWNER_ID = buildSpaceOwnerIdTag(CURRENT_SPACE_ID);
        const OTHER_SPACE_OWNER_ID = buildSpaceOwnerIdTag(OTHER_SPACE_ID);

        const supertest: Record<
          (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
          Record<'none' | 'read' | 'all' | 'allWithGlobalArtifactManagementPrivilege', TestAgent>
        > = {} as Record<
          (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
          Record<'none' | 'read' | 'all' | 'allWithGlobalArtifactManagementPrivilege', TestAgent>
        >;

        before(async () => {
          for (const artifact of ENDPOINT_ARTIFACTS) {
            supertest[artifact.listId] = {
              none: await createSupertestWithCustomRole(`${artifact.listId}_none`, {
                // user is authorized to use _import API in general, but missing artifact-specific privileges
                [SECURITY_FEATURE_ID]: ['minimal_all'],
                [RULES_FEATURE_ID]: ['all'],
              }),

              read: await createSupertestWithCustomRole(`${artifact.listId}_read`, {
                // user is authorized to use _import API in general, but missing artifact-specific privileges
                [SECURITY_FEATURE_ID]: ['minimal_all', artifact.read],
                [RULES_FEATURE_ID]: ['all'],
              }),

              all: await createSupertestWithCustomRole(`${artifact.listId}_all`, {
                // user is authorized for artifact import, but not rule exceptions import
                [SECURITY_FEATURE_ID]: ['minimal_read', artifact.all],
              }),

              allWithGlobalArtifactManagementPrivilege: await createSupertestWithCustomRole(
                `${artifact.listId}_allWithGlobal`,
                {
                  [SECURITY_FEATURE_ID]: [
                    'minimal_read',
                    artifact.all,
                    'global_artifact_management_all',
                  ],
                }
              ),
            };
          }
        });

        ENDPOINT_ARTIFACTS.forEach((artifact) => {
          describe(`Importing ${artifact.name}`, () => {
            let fetchArtifacts: (
              spaceId: string,
              sortField?: string
            ) => Promise<ExceptionListItem[]>;

            before(() => {
              fetchArtifacts = getFetchArtifacts(endpointOpsAnalystSupertest, log, artifact.listId);
            });

            beforeEach(async () => {
              await endpointArtifactTestResources.deleteList(artifact.listId);
            });

            afterEach(async () => {
              await endpointArtifactTestResources.deleteList(artifact.listId);
            });

            describe('when checking privileges', () => {
              it(`should error when importing without artifact privileges`, async () => {
                await supertest[artifact.listId].none
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [{ tags: [CURRENT_SPACE_OWNER_ID] }]),
                    'import_data.ndjson'
                  )
                  .expect(403)
                  .expect(anEndpointArtifactErrorOf('Endpoint authorization failure'));
              });

              it(`should error when importing with ${artifact.read} privileges`, async () => {
                await supertest[artifact.listId].read
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [{ tags: [CURRENT_SPACE_OWNER_ID] }]),
                    'import_data.ndjson'
                  )
                  .expect(403)
                  .expect(anEndpointArtifactErrorOf('Endpoint authorization failure'));
              });

              it(`should succeed when importing with ${artifact.all} privileges`, async () => {
                await supertest[artifact.listId].all
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [{ tags: [CURRENT_SPACE_OWNER_ID] }]),
                    'import_data.ndjson'
                  )
                  .expect(200);
              });
            });

            describe('Space awareness', () => {
              describe('when user has no global artifact privilege', () => {
                it('should import per-policy artifacts from current space', async () => {
                  await supertest[artifact.listId].all
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        { tags: [CURRENT_SPACE_OWNER_ID] },
                        {
                          tags: [
                            CURRENT_SPACE_OWNER_ID,
                            buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),

                            // even if assigned to policy in other space, the tag is kept
                            buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                          ],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200)
                    .expect({
                      errors: [],
                      success: true,
                      success_count: 3,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: true,
                      success_count_exception_list_items: 2,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);

                  expect(items.length).toEqual(2);
                  expect(items[1].tags).toEqual([
                    CURRENT_SPACE_OWNER_ID,
                    buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                    buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                  ]);
                  expect(items[0].tags).toEqual([CURRENT_SPACE_OWNER_ID]);
                });

                it('should not import per-policy artifacts to other spaces when importing without global artifact privilege', async () => {
                  await supertest[artifact.listId].all
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        { item_id: 'wrong-item', tags: [OTHER_SPACE_OWNER_ID] },
                        {
                          item_id: 'good-item',
                          tags: [
                            CURRENT_SPACE_OWNER_ID,
                            buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                          ],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200)
                    .expect({
                      errors: [
                        {
                          error: {
                            message:
                              'EndpointArtifactError: Endpoint authorization failure. Management of "ownerSpaceId" tag requires global artifact management privilege',
                            status_code: 403,
                          },
                          item_id: 'wrong-item',
                          list_id: artifact.listId,
                        },
                      ],
                      success: false,
                      success_count: 2,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: false,
                      success_count_exception_list_items: 1,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);

                  expect(items.length).toEqual(1);
                  expect(items[0].item_id).toEqual('good-item');
                });

                it('should not import global artifacts when importing without global artifact privilege', async () => {
                  await supertest[artifact.listId].all
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'wrong-item',
                          tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG],
                        },
                        {
                          item_id: 'good-item',
                          tags: [CURRENT_SPACE_OWNER_ID],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200)
                    .expect({
                      errors: [
                        {
                          error: {
                            message:
                              'EndpointArtifactError: Endpoint authorization failure. Management of global artifacts requires additional privilege (global artifact management)',
                            status_code: 403,
                          },
                          item_id: 'wrong-item',
                          list_id: artifact.listId,
                        },
                      ],
                      success: false,
                      success_count: 2,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: false,
                      success_count_exception_list_items: 1,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(1);
                  expect(items[0].item_id).toEqual('good-item');
                });
              });

              describe('when with global artifact privilege', () => {
                it(`should import global artifacts`, async () => {
                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        { tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG] },
                        { tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG] },
                        { tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG] },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200)
                    .expect({
                      errors: [],
                      success: true,
                      success_count: 4,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: true,
                      success_count_exception_list_items: 3,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(3);
                });

                it('should import per-policy artifacts to other space if assigned to policy in current space', async () => {
                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'to-other-space',
                          tags: [
                            OTHER_SPACE_OWNER_ID,
                            buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                            buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                          ],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200)
                    .expect({
                      errors: [],
                      success: true,
                      success_count: 2,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: true,
                      success_count_exception_list_items: 1,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);

                  expect(items.length).toEqual(1);
                  expect(items[0].tags).toEqual([
                    OTHER_SPACE_OWNER_ID,
                    buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                    // policy id in other space is kept
                    buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                  ]);
                });

                // todo do we need this? create API allows this, but import could block it
                it('should not import per-policy artifacts to other space if not visible in current space', async () => {});
              });

              describe('when data is invalid', () => {
                // todo do we need this? create allows this, and will use actual space ID instead
                it('should not import per-policy artifacts with invalid space id', async () => {});

                it('should import per-policy artifacts assigned to invalid policy ids and remove invalid ids', async () => {
                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'with-invalid-policy-id',
                          tags: [
                            CURRENT_SPACE_OWNER_ID,
                            buildPerPolicyTag('i-do-not-exist'),
                            buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                            buildPerPolicyTag('me-neither'),
                            buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                          ],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200)
                    .expect({
                      errors: [],
                      success: true,
                      success_count: 2,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: true,
                      success_count_exception_list_items: 1,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);

                  expect(items.length).toEqual(1);

                  // invalid policy ids are removed, valid ones are kept
                  expect(items[0].tags).toEqual([
                    CURRENT_SPACE_OWNER_ID,
                    buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                    buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                  ]);

                  // changes indicated in a comment
                  expect(items[0].comments).toContainEqual(
                    expect.objectContaining({
                      comment: `Please check policy assignment. The following policy IDs have been removed from artifact during import:\n- "i-do-not-exist"\n- "me-neither"`,
                    })
                  );

                  const username = `${artifact.listId}_allWithGlobal`;
                  expect(items[0].comments[0].created_by).toEqual(username);
                });
              });

              it('should return conflict on list, but import artifacts when list exist without deleting existing ones', async () => {
                await endpointArtifactTestResources.createList(artifact.listId);
                await endpointArtifactTestResources.createArtifact(artifact.listId, {
                  tags: [GLOBAL_ARTIFACT_TAG],
                  item_id: 'existing-global-artifact-in-current-space',
                });
                await endpointArtifactTestResources.createArtifact(artifact.listId, {
                  tags: [],
                  item_id: 'existing-per-policy-artifact-in-current-space',
                });

                await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [
                      { item_id: 'imported-artifact', tags: [CURRENT_SPACE_OWNER_ID] },
                    ]),
                    'import_data.ndjson'
                  )
                  .expect(200)
                  .expect({
                    errors: [
                      {
                        error: {
                          message: `Found that list_id: "${artifact.listId}" already exists. Import of list_id: "${artifact.listId}" skipped.`,
                          status_code: 409,
                        },
                        list_id: artifact.listId,
                      },
                    ],
                    success: false,
                    success_count: 1,
                    success_exception_lists: false,
                    success_count_exception_lists: 0,
                    success_exception_list_items: true,
                    success_count_exception_list_items: 1,
                  } as ImportExceptionsResponseSchema);

                const artifactsInCurrentSpace = (
                  await fetchArtifacts(CURRENT_SPACE_ID, 'item_id')
                ).map((item) => item.item_id);

                expect(artifactsInCurrentSpace).toEqual([
                  'existing-global-artifact-in-current-space',
                  'existing-per-policy-artifact-in-current-space',
                  'imported-artifact',
                ]);
              });

              describe('when `overwrite` query param is `true`', () => {
                let existingGlobalArtifactInCurrentSpace: ArtifactTestData;
                let existingGlobalArtifactInOtherSpace: ArtifactTestData;
                let existingPerPolicyArtifactInCurrentSpace: ArtifactTestData;
                let existingUnassignedPerPolicyArtifactInOtherSpace: ArtifactTestData;
                let existingPerPolicyArtifactInOtherSpaceVisibleInCurrentSpace: ArtifactTestData;

                beforeEach(async () => {
                  await endpointArtifactTestResources.createList(artifact.listId);

                  existingGlobalArtifactInCurrentSpace =
                    await endpointArtifactTestResources.createArtifact(artifact.listId, {
                      tags: [GLOBAL_ARTIFACT_TAG],
                      item_id: 'existing-global-artifact-in-current-space',
                    });

                  existingGlobalArtifactInOtherSpace =
                    await endpointArtifactTestResources.createArtifact(
                      artifact.listId,
                      {
                        tags: [GLOBAL_ARTIFACT_TAG],
                        item_id: 'existing-global-artifact-in-other-space',
                      },
                      { spaceId: OTHER_SPACE_ID }
                    );

                  existingPerPolicyArtifactInCurrentSpace =
                    await endpointArtifactTestResources.createArtifact(artifact.listId, {
                      tags: [buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id)],
                      item_id: 'existing-per-policy-artifact-in-current-space',
                    });

                  existingUnassignedPerPolicyArtifactInOtherSpace =
                    await endpointArtifactTestResources.createArtifact(
                      artifact.listId,
                      {
                        tags: [],
                        item_id: 'existing-per-policy-artifact-in-other-space',
                      },
                      { spaceId: OTHER_SPACE_ID }
                    );

                  existingPerPolicyArtifactInOtherSpaceVisibleInCurrentSpace =
                    await endpointArtifactTestResources.createArtifact(
                      artifact.listId,
                      {
                        tags: [GLOBAL_ARTIFACT_TAG], // start with global
                        item_id:
                          'existing-per-policy-artifact-in-other-space-visible-in-current-space',
                      },
                      { spaceId: OTHER_SPACE_ID }
                    );

                  // then update to have per-policy tags, which should make it visible in current space, and removed on import with overwrite
                  existingPerPolicyArtifactInOtherSpaceVisibleInCurrentSpace =
                    await endpointArtifactTestResources.updateExceptionItem({
                      ...existingPerPolicyArtifactInOtherSpaceVisibleInCurrentSpace.artifact,
                      tags: [
                        buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                        OTHER_SPACE_OWNER_ID,
                      ],
                    });
                });

                describe('when without global artifact privilege', () => {
                  it('should remove existing per-policy artifacts OWNED by current space', async () => {
                    await supertest[artifact.listId].all
                      .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
                      .set('kbn-xsrf', 'true')
                      .on('error', createSupertestErrorLogger(log))
                      .attach(
                        'file',
                        buildImportBuffer(artifact.listId, [
                          {
                            name: "i'm imported!",
                            tags: [CURRENT_SPACE_OWNER_ID],
                            item_id: 'imported-artifact',
                          },
                        ]),
                        'import_data.ndjson'
                      )
                      .expect(200)
                      .expect({
                        errors: [],
                        success: true,
                        success_count: 1,
                        success_exception_lists: true,
                        success_count_exception_lists: 0,
                        success_exception_list_items: true,
                        success_count_exception_list_items: 1,
                      } as ImportExceptionsResponseSchema);

                    const artifactsInCurrentSpace = (
                      await fetchArtifacts(CURRENT_SPACE_ID, 'item_id')
                    ).map((item) => item.item_id);
                    const artifactsInOtherSpace = (
                      await fetchArtifacts(OTHER_SPACE_ID, 'item_id')
                    ).map((item) => item.item_id);

                    expect(artifactsInCurrentSpace).toEqual([
                      'existing-global-artifact-in-current-space',
                      'existing-global-artifact-in-other-space',
                      // 'existing-per-policy-artifact-in-current-space', => deleted
                      'existing-per-policy-artifact-in-other-space-visible-in-current-space',
                      'imported-artifact',
                    ]);

                    expect(artifactsInOtherSpace).toEqual([
                      'existing-global-artifact-in-current-space',
                      'existing-global-artifact-in-other-space',
                      'existing-per-policy-artifact-in-other-space',
                      'existing-per-policy-artifact-in-other-space-visible-in-current-space',
                    ]);
                  });
                });

                describe('when with global artifact privilege', () => {
                  it('should remove existing per-policy artifacts VISIBLE in current space and all global artifacts', async () => {
                    await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                      .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
                      .set('kbn-xsrf', 'true')
                      .on('error', createSupertestErrorLogger(log))
                      .attach(
                        'file',
                        buildImportBuffer(artifact.listId, [
                          {
                            name: "i'm imported!",
                            tags: [CURRENT_SPACE_OWNER_ID],
                            item_id: 'imported-artifact',
                          },
                        ]),
                        'import_data.ndjson'
                      )
                      .expect(200)
                      .expect({
                        errors: [],
                        success: true,
                        success_count: 1,
                        success_exception_lists: true,
                        success_count_exception_lists: 0,
                        success_exception_list_items: true,
                        success_count_exception_list_items: 1,
                      } as ImportExceptionsResponseSchema);

                    const artifactsInCurrentSpace = (
                      await fetchArtifacts(CURRENT_SPACE_ID, 'item_id')
                    ).map((item) => item.item_id);
                    const artifactsInOtherSpace = (
                      await fetchArtifacts(OTHER_SPACE_ID, 'item_id')
                    ).map((item) => item.item_id);

                    expect(artifactsInCurrentSpace).toEqual([
                      // all visible artifacts are deleted, even if not owned by current space
                      'imported-artifact',
                    ]);

                    expect(artifactsInOtherSpace).toEqual([
                      // 'existing-global-artifact-in-current-space', => deleted
                      // 'existing-global-artifact-in-other-space',   => deleted
                      'existing-per-policy-artifact-in-other-space',
                      // 'existing-per-policy-artifact-in-other-space-visible-in-current-space', => deleted
                    ]);
                  });
                });
              });
            });

            describe('when importing multiple lists', () => {
              afterEach(async () => {
                await endpointArtifactTestResources.deleteList('some_other_list_id');
                await endpointArtifactTestResources.deleteList('another_list_id');
              });

              it('should succeed when none of the lists are Endpoint artifacts', async () => {
                const generator = new ExceptionsListItemGenerator();

                const importedJson = `
                    ${buildListInfo('some_other_list_id')}
                    ${JSON.stringify(generator.generate({ list_id: 'some_other_list_id' }))}
                    ${buildListInfo('another_list_id')}
                    ${JSON.stringify(generator.generate({ list_id: 'another_list_id' }))}
                    ${JSON.stringify(
                      buildDetails({
                        exported_exception_list_count: 2,
                        exported_exception_list_item_count: 2,
                      })
                    )}
                    `;

                await endpointOpsAnalystSupertest
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log))
                  .attach('file', Buffer.from(importedJson, 'utf8'), 'import_data.ndjson')
                  .expect(200);
              });

              it('should error when any list is related to Endpoint artifacts', async () => {
                const generator = new ExceptionsListItemGenerator();

                const importedJson = `
                    ${buildListInfo('some_other_list_id')}
                    ${JSON.stringify(generator.generate({ list_id: 'some_other_list_id' }))}
                    ${buildListInfo(artifact.listId)}
                    ${JSON.stringify(
                      generator.generateEndpointArtifact(artifact.listId, {
                        tags: [CURRENT_SPACE_OWNER_ID],
                      })
                    )}
                    ${JSON.stringify(
                      buildDetails({
                        exported_exception_list_count: 2,
                        exported_exception_list_item_count: 2,
                      })
                    )}
                    `;

                await endpointOpsAnalystSupertest
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log).ignoreCodes([400]))
                  .attach('file', Buffer.from(importedJson, 'utf8'), 'import_data.ndjson')
                  .expect(400)
                  .expect(
                    anEndpointArtifactErrorOf(
                      'Importing multiple Endpoint artifact exception lists is not supported'
                    )
                  );
              });
            });

            describe('`new_list` query parameter', () => {
              it('should error when list exists and `new_list` query param is `true`, but import items', async () => {
                await endpointArtifactTestResources.createList(artifact.listId);
                await endpointArtifactTestResources.createArtifact(artifact.listId, {
                  item_id: 'existing-artifact',
                  tags: [GLOBAL_ARTIFACT_TAG],
                });

                await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .query({ new_list: true })
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [
                      {
                        item_id: 'imported-artifact',
                        tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG],
                      },
                    ]),
                    'import_data.ndjson'
                  )
                  .expect(200)
                  .expect({
                    errors: [
                      {
                        error: {
                          message: `Found that list_id: "${artifact.listId}" already exists. Import of list_id: "${artifact.listId}" skipped.`,
                          status_code: 409,
                        },
                        list_id: artifact.listId,
                      },
                    ],
                    success: false,
                    success_count: 1,
                    success_exception_lists: false,
                    success_count_exception_lists: 0,
                    success_exception_list_items: true,
                    success_count_exception_list_items: 1,
                  } as ImportExceptionsResponseSchema);

                const items = await fetchArtifacts(CURRENT_SPACE_ID);
                expect(items.map(({ item_id }) => item_id)).toEqual([
                  'existing-artifact',
                  'imported-artifact',
                ]);
              });

              it('should succeed when list does not exist and `new_list` query param is `true`', async () => {
                await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .query({ new_list: true })
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [
                      {
                        item_id: 'imported-artifact',
                        tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG],
                      },
                    ]),
                    'import_data.ndjson'
                  )
                  .expect(200)
                  .expect({
                    errors: [],
                    success: true,
                    success_count: 2,
                    success_exception_lists: true,
                    success_count_exception_lists: 1,
                    success_exception_list_items: true,
                    success_count_exception_list_items: 1,
                  } as ImportExceptionsResponseSchema);

                const items = await fetchArtifacts(CURRENT_SPACE_ID);
                expect(items.map(({ item_id }) => item_id)).toEqual(['imported-artifact']);
              });
            });

            it('should add a comment to imported artifacts with relevant data', async () => {
              await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                .post(`${EXCEPTION_LIST_URL}/_import`)
                .query({ new_list: true })
                .set('kbn-xsrf', 'true')
                .on('error', createSupertestErrorLogger(log))
                .attach(
                  'file',
                  buildImportBuffer(artifact.listId, [
                    {
                      item_id: 'imported-artifact-without-existing-comment',
                      tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG],
                      created_by: 'original-creator-1',
                      created_at: 'random-date-1',
                    },
                    {
                      item_id: 'imported-artifact-with-existing-comment',
                      tags: [CURRENT_SPACE_OWNER_ID, GLOBAL_ARTIFACT_TAG],
                      created_by: 'original-creator-2',
                      created_at: 'random-date-2',
                      comments: [
                        {
                          comment: 'I am a comment!',
                          created_at: '2026-02-26T09:46:53.602Z',
                          created_by: 'some_user',
                          id: '9414e275-3c14-4814-9a6c-e789589bc9b1',
                        },
                      ],
                    },
                  ]),
                  'import_data.ndjson'
                )
                .expect(200)
                .expect({
                  errors: [],
                  success: true,
                  success_count: 3,
                  success_exception_lists: true,
                  success_count_exception_lists: 1,
                  success_exception_list_items: true,
                  success_count_exception_list_items: 2,
                } as ImportExceptionsResponseSchema);

              const items = await fetchArtifacts(CURRENT_SPACE_ID);
              expect(
                items.map(({ item_id, comments }) => ({
                  item_id,
                  comments,
                }))
              ).toEqual([
                {
                  item_id: 'imported-artifact-without-existing-comment',
                  comments: [
                    {
                      comment: `Imported artifact.\nOriginally created by "original-creator-1" at "random-date-1".`,
                      created_at: expect.any(String),
                      created_by: `${artifact.listId}_allWithGlobal`,
                      id: expect.any(String),
                    },
                  ],
                },
                {
                  item_id: 'imported-artifact-with-existing-comment',
                  comments: [
                    expect.objectContaining({ comment: 'I am a comment!' }),
                    expect.objectContaining({
                      comment: `Imported artifact.\nOriginally created by "original-creator-2" at "random-date-2".`,
                    }),
                  ],
                },
              ]);
            });

            it('should add a tag to imported artifacts', async () => {});

            describe('compatibility with artifacts exported before space awareness - when artifacts have no ownerSpaceId', () => {
              it('should add/not add global artifact tag to Endpoint exceptions/artifacts', async () => {});
              it('should/should not import artifacts without global artifact privilege', async () => {});
            });
          });
        });
      });
    } else {
      describe('Endpoint exceptions move feature flag disabled', () => {
        // All non-Endpoint exceptions artifacts are not allowed to import
        ENDPOINT_ARTIFACT_LIST_IDS.filter(
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

            expect(body.message).toEqual(
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

          const items = await getFetchArtifacts(
            endpointOpsAnalystSupertest,
            log,
            ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
          )(CURRENT_SPACE_ID);

          // After import - all items should be returned on a GET `find` request.
          expect(items.length).toEqual(3);

          for (const endpointException of items) {
            expect(endpointException.tags).toContain(GLOBAL_ARTIFACT_TAG);
          }

          await endpointArtifactTestResources.deleteList(
            ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
          );
        });
      });
    }
  });
}

const getFetchArtifacts =
  (supertest: TestAgent, log: ToolingLog, listId: string) =>
  async (spaceId: string, sortField?: string) => {
    const { body }: { body: FindExceptionListItemsResponse } = await supertest
      .get(addSpaceIdToPath('/', spaceId, `${EXCEPTION_LIST_ITEM_URL}/_find`))
      .set('kbn-xsrf', 'true')
      .on('error', createSupertestErrorLogger(log))
      .query({
        list_id: listId,
        namespace_type: 'agnostic',
        sort_field: sortField ?? undefined,
        sort_order: sortField ? 'asc' : undefined,
      } as FindExceptionListItemsRequestQueryInput)
      .send()
      .expect(200);

    return body.data;
  };

const buildRole = (
  name: string,
  featurePrivileges: FeaturesPrivileges,
  spaces: string[] = ['*']
): CustomRole => ({
  name,
  privileges: {
    kibana: [
      {
        base: [],
        feature: featurePrivileges,
        spaces,
      },
    ],
    elasticsearch: { cluster: [], indices: [] },
  },
});

const anEndpointArtifactErrorOf = (message: string) => (res: { body: { message: string } }) =>
  expect(res.body.message).toBe(`EndpointArtifactError: ${message}`);

const buildImportBuffer = (
  listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
  itemsArray: Partial<ExceptionListItemSchema>[] = [{}, {}, {}]
): Buffer => {
  const generator = new ExceptionsListItemGenerator();

  const items = itemsArray.map((override) => generator.generateEndpointArtifact(listId, override));

  return Buffer.from(
    `
      ${buildListInfo(listId)}
      ${items.map((item) => JSON.stringify(item)).join('\n')}
      ${JSON.stringify(buildDetails({ exported_exception_list_item_count: items.length }))}
      `,
    'utf8'
  );
};

const buildListInfo = (listId: string): string => {
  const listInfo = Object.values(ENDPOINT_ARTIFACT_LISTS).find((listDefinition) => {
    return listDefinition.id === listId;
  }) ?? {
    id: listId,
    name: `random list for ${listId}`,
    description: `random description for ${listId}`,
  };

  return `{"_version":"WzEsMV0=","created_at":"2025-08-21T14:20:07.012Z","created_by":"kibana","description":"${listInfo.description}","id":"${listId}","immutable":false,"list_id":"${listId}","name":"${listInfo.name}","namespace_type":"agnostic","os_types":[],"tags":[],"tie_breaker_id":"034d07f4-fa33-43bb-adfa-6f6bda7921ce","type":"endpoint","updated_at":"2025-08-21T14:20:07.012Z","updated_by":"kibana","version":1}`;
};

const buildDetails = (override: Partial<ExportExceptionDetails> = {}): ExportExceptionDetails => ({
  exported_exception_list_count: 1,
  exported_exception_list_item_count: 3,
  missing_exception_list_item_count: 0,
  missing_exception_list_items: [],
  missing_exception_lists: [],
  missing_exception_lists_count: 0,
  ...override,
});
