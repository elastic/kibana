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
import {
  GLOBAL_ARTIFACT_TAG,
  IMPORTED_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';
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
import type {
  FindExceptionListItemsRequestQueryInput,
  FindExceptionListItemsResponse,
} from '@kbn/securitysolution-exceptions-common/api';
import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { addSpaceIdToPath } from '@kbn/spaces-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  disablePerPolicyEndpointExceptions,
  optInForPerPolicyEndpointExceptions,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/endpoint_artifact_services';
import type { CustomRole } from '../../../../config/services/types';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { createSupertestErrorLogger } from '../../utils';

const ENDPOINT_ARTIFACTS: readonly {
  readonly listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number];
  readonly name: string;
  readonly read: string;
  readonly all: string;
}[] = Object.freeze([
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
]);

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
    const CURRENT_SPACE_OWNER_TAG = buildSpaceOwnerIdTag(CURRENT_SPACE_ID);
    const OTHER_SPACE_OWNER_TAG = buildSpaceOwnerIdTag(OTHER_SPACE_ID);

    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let fleetEndpointPolicyOtherSpace: PolicyTestResourceInfo;
    let endpointOpsAnalystSupertest: TestAgent;

    type SupertestContainer = Record<
      (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
      Record<'none' | 'read' | 'all' | 'allWithGlobalArtifactManagementPrivilege', TestAgent>
    >;

    const supertest: SupertestContainer = {} as SupertestContainer;

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
        ENDPOINT_ARTIFACTS.forEach((artifact) => {
          describe(`Importing ${artifact.name}`, () => {
            let fetchArtifacts: ReturnType<typeof getFetchArtifacts>;

            before(async () => {
              fetchArtifacts = getFetchArtifacts(endpointOpsAnalystSupertest, log, artifact.listId);

              await optInForPerPolicyEndpointExceptions(kbnServer);
            });

            beforeEach(async () => {
              await endpointArtifactTestResources.deleteList(artifact.listId);
            });

            afterEach(async () => {
              await endpointArtifactTestResources.deleteList(artifact.listId);
            });

            after(async () => {
              await disablePerPolicyEndpointExceptions(kbnServer);
            });

            describe('when checking privileges', () => {
              it(`should error when importing without artifact privileges`, async () => {
                await supertest[artifact.listId].none
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [{ tags: [CURRENT_SPACE_OWNER_TAG] }]),
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
                    buildImportBuffer(artifact.listId, [{ tags: [CURRENT_SPACE_OWNER_TAG] }]),
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
                    buildImportBuffer(artifact.listId, [{ tags: [CURRENT_SPACE_OWNER_TAG] }]),
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
                        {
                          item_id: 'assigned-per-policy-artifact',
                          tags: [
                            CURRENT_SPACE_OWNER_TAG,
                            buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),

                            // even if assigned to policy in other space, the tag is kept
                            buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                          ],
                        },
                        {
                          item_id: 'unassigned-per-policy-artifact',
                          tags: [CURRENT_SPACE_OWNER_TAG],
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
                  expect(items[0]).toEqual(
                    expect.objectContaining({
                      item_id: 'assigned-per-policy-artifact',
                      tags: [
                        CURRENT_SPACE_OWNER_TAG,
                        buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                        buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                        IMPORTED_ARTIFACT_TAG,
                      ],
                    })
                  );
                  expect(items[1]).toEqual(
                    expect.objectContaining({
                      item_id: 'unassigned-per-policy-artifact',
                      tags: [CURRENT_SPACE_OWNER_TAG, IMPORTED_ARTIFACT_TAG],
                    })
                  );
                });

                it('should not import per-policy artifacts to other spaces when importing without global artifact privilege', async () => {
                  await supertest[artifact.listId].all
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        { item_id: 'wrong-item', tags: [OTHER_SPACE_OWNER_TAG] },
                        {
                          item_id: 'good-item',
                          tags: [
                            CURRENT_SPACE_OWNER_TAG,
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
                              'EndpointArtifactError: Endpoint authorization failure. Importing artifacts to a different space requires global artifact management privilege',
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
                          tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
                        },
                        {
                          item_id: 'good-item',
                          tags: [CURRENT_SPACE_OWNER_TAG],
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
                        { tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG] },
                        { tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG] },
                        { tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG] },
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
                            OTHER_SPACE_OWNER_TAG,
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
                    OTHER_SPACE_OWNER_TAG,
                    buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                    // policy id in other space is kept
                    buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                    IMPORTED_ARTIFACT_TAG,
                  ]);
                });

                it('should not import per-policy artifacts to other space if not visible in current space', async () => {
                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'visible-in-current-space',
                          tags: [OTHER_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
                        },
                        {
                          item_id: 'not-visible-in-current-space-because-unassigned',
                          tags: [OTHER_SPACE_OWNER_TAG],
                        },
                        {
                          item_id: 'not-visible-in-current-space-because-assigned-only-there',
                          tags: [
                            OTHER_SPACE_OWNER_TAG,
                            buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
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
                              'EndpointArtifactError: Endpoint authorization failure. Importing artifacts that are not visible in the current space is not allowed',
                            status_code: 403,
                          },
                          item_id: 'not-visible-in-current-space-because-unassigned',
                          list_id: artifact.listId,
                        },
                        {
                          error: {
                            message:
                              'EndpointArtifactError: Endpoint authorization failure. Importing artifacts that are not visible in the current space is not allowed',
                            status_code: 403,
                          },
                          item_id: 'not-visible-in-current-space-because-assigned-only-there',
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
                });
              });

              describe('when data is invalid', () => {
                describe('when the space id does not exist', () => {
                  it('should not import artifacts without global privilege based on missing privilege', async () => {
                    await supertest[artifact.listId].all
                      .post(`${EXCEPTION_LIST_URL}/_import`)
                      .set('kbn-xsrf', 'true')
                      .on('error', createSupertestErrorLogger(log))
                      .attach(
                        'file',
                        buildImportBuffer(artifact.listId, [
                          {
                            item_id: 'global-artifact-with-invalid-space-id',
                            tags: [buildSpaceOwnerIdTag('i-dont-exist'), GLOBAL_ARTIFACT_TAG],
                          },
                          {
                            item_id: 'per-policy-artifact-with-invalid-space-id',
                            tags: [buildSpaceOwnerIdTag('i-dont-exist')],
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
                                'EndpointArtifactError: Endpoint authorization failure. Importing artifacts to a different space requires global artifact management privilege',
                              status_code: 403,
                            },
                            item_id: 'global-artifact-with-invalid-space-id',
                            list_id: artifact.listId,
                          },
                          {
                            error: {
                              message:
                                'EndpointArtifactError: Endpoint authorization failure. Importing artifacts to a different space requires global artifact management privilege',
                              status_code: 403,
                            },
                            item_id: 'per-policy-artifact-with-invalid-space-id',
                            list_id: artifact.listId,
                          },
                        ],
                        success: false,
                        success_count: 1,
                        success_exception_lists: true,
                        success_count_exception_lists: 1,
                        success_exception_list_items: false,
                        success_count_exception_list_items: 0,
                      } as ImportExceptionsResponseSchema);

                    const items = await fetchArtifacts(CURRENT_SPACE_ID);
                    expect(items.length).toEqual(0);
                  });

                  it('should not import artifacts with global privilege', async () => {
                    await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                      .post(`${EXCEPTION_LIST_URL}/_import`)
                      .set('kbn-xsrf', 'true')
                      .on('error', createSupertestErrorLogger(log))
                      .attach(
                        'file',
                        buildImportBuffer(artifact.listId, [
                          {
                            item_id: 'global-artifact-with-invalid-space-id',
                            tags: [buildSpaceOwnerIdTag('i-dont-exist-1'), GLOBAL_ARTIFACT_TAG],
                          },
                          {
                            item_id: 'per-policy-artifact-with-invalid-space-id',
                            tags: [
                              buildSpaceOwnerIdTag('i-dont-exist-2'),
                              buildSpaceOwnerIdTag('i-dont-exist-3'),
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
                                'EndpointArtifactError: Importing artifacts with invalid owner space IDs is not allowed. The following space ID is invalid or unaccessible by current user: i-dont-exist-1',
                              status_code: 403,
                            },
                            item_id: 'global-artifact-with-invalid-space-id',
                            list_id: artifact.listId,
                          },
                          {
                            error: {
                              message:
                                'EndpointArtifactError: Importing artifacts with invalid owner space IDs is not allowed. The following space IDs are invalid or unaccessible by current user: i-dont-exist-2, i-dont-exist-3',
                              status_code: 403,
                            },
                            item_id: 'per-policy-artifact-with-invalid-space-id',
                            list_id: artifact.listId,
                          },
                        ],
                        success: false,
                        success_count: 1,
                        success_exception_lists: true,
                        success_count_exception_lists: 1,
                        success_exception_list_items: false,
                        success_count_exception_list_items: 0,
                      } as ImportExceptionsResponseSchema);

                    const items = await fetchArtifacts(CURRENT_SPACE_ID);
                    expect(items.length).toEqual(0);
                  });
                });

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
                            CURRENT_SPACE_OWNER_TAG,
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
                    CURRENT_SPACE_OWNER_TAG,
                    buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                    buildPerPolicyTag(fleetEndpointPolicyOtherSpace.packagePolicy.id),
                    IMPORTED_ARTIFACT_TAG,
                  ]);

                  // changes indicated in a comment
                  expect(items[0].comments).toContainEqual(
                    expect.objectContaining({
                      comment: `Please check policy assignment. The following policy IDs have been removed from artifact during import:\n- "i-do-not-exist"\n- "me-neither"`,
                    })
                  );
                });
              });

              describe('when trying to import "single" namespace', () => {
                beforeEach(async () => {
                  await deleteExceptionList(endpointOpsAnalystSupertest, artifact.listId, 'single');
                });

                afterEach(async () => {
                  await deleteExceptionList(endpointOpsAnalystSupertest, artifact.listId, 'single');
                });

                it("should skip validation when all lists/items are in 'single' namespace (similarly to pre-create hook)", async () => {
                  await endpointArtifactTestResources.createList(artifact.listId);

                  await endpointOpsAnalystSupertest
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(
                        artifact.listId,
                        [
                          {
                            item_id: 'per-policy-artifact',
                            tags: [
                              buildSpaceOwnerIdTag(
                                'not-existing-space-to-trigger-validation-error'
                              ),
                            ],
                            namespace_type: 'single',
                          },
                        ],
                        'single'
                      ),
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
                  expect(items.length).toEqual(0);
                });

                it('should fail when namespaces are mixed - as it counts as multiple lists', async () => {
                  await endpointArtifactTestResources.createList(artifact.listId);

                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log).ignoreCodes([400]))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'global-artifact-with-single-namespace',
                          tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
                          namespace_type: 'single',
                        },
                        {
                          item_id: 'per-policy-artifact-with-agnostic-namespace',
                          tags: [CURRENT_SPACE_OWNER_TAG],
                          namespace_type: 'agnostic',
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(400)
                    .expect(
                      anEndpointArtifactErrorOf(
                        'Importing multiple Endpoint artifact exception list types at the same time is not supported'
                      )
                    );

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(0);
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
                      { item_id: 'imported-artifact', tags: [CURRENT_SPACE_OWNER_TAG] },
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

                const artifactsInCurrentSpace = (await fetchArtifacts(CURRENT_SPACE_ID)).map(
                  (item) => item.item_id
                );

                expect(artifactsInCurrentSpace).toEqual([
                  'existing-global-artifact-in-current-space',
                  'existing-per-policy-artifact-in-current-space',
                  'imported-artifact',
                ]);
              });

              describe('when `overwrite` query param is `true`', () => {
                beforeEach(async () => {
                  await endpointArtifactTestResources.createList(artifact.listId);

                  await endpointArtifactTestResources.createArtifact(artifact.listId, {
                    tags: [GLOBAL_ARTIFACT_TAG],
                    item_id: 'existing-global-artifact-in-current-space',
                  });

                  await endpointArtifactTestResources.createArtifact(
                    artifact.listId,
                    {
                      tags: [GLOBAL_ARTIFACT_TAG],
                      item_id: 'existing-global-artifact-in-other-space',
                    },
                    { spaceId: OTHER_SPACE_ID }
                  );

                  await endpointArtifactTestResources.createArtifact(artifact.listId, {
                    tags: [buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id)],
                    item_id: 'existing-per-policy-artifact-in-current-space',
                  });

                  await endpointArtifactTestResources.createArtifact(
                    artifact.listId,
                    { tags: [], item_id: 'existing-per-policy-artifact-in-other-space' },
                    { spaceId: OTHER_SPACE_ID }
                  );

                  const createdArtifact = await endpointArtifactTestResources.createArtifact(
                    artifact.listId,
                    {
                      tags: [GLOBAL_ARTIFACT_TAG], // start with global
                      item_id:
                        'existing-per-policy-artifact-in-other-space-visible-in-current-space',
                    },
                    { spaceId: OTHER_SPACE_ID }
                  );

                  // then update to have per-policy tags, which should make it visible in current space, and removed on import with overwrite
                  await endpointArtifactTestResources.updateExceptionItem({
                    ...createdArtifact.artifact,
                    tags: [
                      buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
                      OTHER_SPACE_OWNER_TAG,
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
                            tags: [CURRENT_SPACE_OWNER_TAG],
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

                    const artifactsInCurrentSpace = (await fetchArtifacts(CURRENT_SPACE_ID)).map(
                      (item) => item.item_id
                    );
                    const artifactsInOtherSpace = (await fetchArtifacts(OTHER_SPACE_ID)).map(
                      (item) => item.item_id
                    );

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
                            tags: [CURRENT_SPACE_OWNER_TAG],
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

                    const artifactsInCurrentSpace = (await fetchArtifacts(CURRENT_SPACE_ID)).map(
                      (item) => item.item_id
                    );
                    const artifactsInOtherSpace = (await fetchArtifacts(OTHER_SPACE_ID)).map(
                      (item) => item.item_id
                    );

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
                        tags: [CURRENT_SPACE_OWNER_TAG],
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
                      'Importing multiple Endpoint artifact exception list types at the same time is not supported'
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
                        tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
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
                        tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
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
                .set('kbn-xsrf', 'true')
                .on('error', createSupertestErrorLogger(log))
                .attach(
                  'file',
                  buildImportBuffer(artifact.listId, [
                    {
                      item_id: 'imported-artifact-without-existing-comment',
                      tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
                      created_by: 'original-creator-1',
                      created_at: 'random-date-1',
                    },
                    {
                      item_id: 'imported-artifact-with-existing-comment',
                      tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
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
                  item_id: 'imported-artifact-with-existing-comment',
                  comments: [
                    expect.objectContaining({ comment: 'I am a comment!' }),
                    expect.objectContaining({
                      comment: `Imported artifact.\nOriginally created by "original-creator-2" at "random-date-2".`,
                    }),
                  ],
                },
                {
                  item_id: 'imported-artifact-without-existing-comment',
                  comments: [
                    {
                      comment: `Imported artifact.\nOriginally created by "original-creator-1" at "random-date-1".`,
                      created_at: expect.any(String),
                      created_by: expect.any(String), // we got different test usernames on ESS and Serverless
                      id: expect.any(String),
                    },
                  ],
                },
              ]);
            });

            it('should add a tag to imported artifacts', async () => {
              await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                .post(`${EXCEPTION_LIST_URL}/_import`)
                .set('kbn-xsrf', 'true')
                .on('error', createSupertestErrorLogger(log))
                .attach(
                  'file',
                  buildImportBuffer(artifact.listId, [
                    {
                      item_id: 'imported-artifact',
                      tags: [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG],
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
              expect(items.map(({ tags }) => tags)).toEqual([
                [CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG, IMPORTED_ARTIFACT_TAG],
              ]);
            });

            describe('compatibility with artifacts exported before space awareness - when artifacts have no ownerSpaceId', () => {
              if (artifact.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id) {
                it('should add global artifact tag to Endpoint exceptions as they have been global', async () => {
                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'imported-artifact',
                          tags: [],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(1);
                  expect(items[0].tags).toContain(GLOBAL_ARTIFACT_TAG);
                });

                it('should not add global artifact tag to Endpoint exceptions when namespace is "single"', async () => {
                  await endpointArtifactTestResources.createList(
                    ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
                  );

                  await endpointOpsAnalystSupertest
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(
                        artifact.listId,
                        [
                          {
                            item_id: 'imported-artifact',
                            tags: [],
                            namespace_type: 'single',
                          },
                        ],
                        'single'
                      ),
                      'import_data.ndjson'
                    )
                    .expect(200);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID, 'single');
                  expect(items.length).toEqual(1);
                  expect(items[0].tags).toEqual([]);
                });
              } else {
                it(`should not add global artifact tag to ${artifact.name}`, async () => {
                  await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        {
                          item_id: 'imported-artifact',
                          tags: [],
                        },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(1);
                  expect(items[0].tags).not.toContain(GLOBAL_ARTIFACT_TAG);
                });
              }

              it(`should add owner space ID tag to ${artifact.name}`, async () => {
                await supertest[artifact.listId].allWithGlobalArtifactManagementPrivilege
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [
                      {
                        item_id: 'imported-artifact',
                        tags: [],
                      },
                    ]),
                    'import_data.ndjson'
                  )
                  .expect(200);

                const items = await fetchArtifacts(CURRENT_SPACE_ID);
                expect(items.length).toEqual(1);
                expect(items[0].tags).toContain(CURRENT_SPACE_OWNER_TAG);
              });

              if (artifact.listId === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id) {
                it('should not import Endpoint exceptions without global artifact privilege, as they have been global', async () => {
                  await supertest[artifact.listId].all
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        { item_id: 'imported-artifact', tags: [] },
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
                          item_id: 'imported-artifact',
                          list_id: artifact.listId,
                        },
                      ],
                      success: false,
                      success_count: 1,
                      success_exception_lists: true,
                      success_count_exception_lists: 1,
                      success_exception_list_items: false,
                      success_count_exception_list_items: 0,
                    } as ImportExceptionsResponseSchema);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(0);
                });
              } else {
                it('should import artifacts without global artifact privilege, as they are not global', async () => {
                  await supertest[artifact.listId].all
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        { item_id: 'imported-artifact', tags: [] },
                      ]),
                      'import_data.ndjson'
                    )
                    .expect(200);

                  const items = await fetchArtifacts(CURRENT_SPACE_ID);
                  expect(items.length).toEqual(1);
                });
              }
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
      });
    }

    // we should keep the same behavior for Endpoint exceptions import until the user has opted-in to per-policy usage
    describe('when importing endpoint exceptions (without FF) and (with FF without per-policy opt-in)', () => {
      let fetchArtifacts: ReturnType<typeof getFetchArtifacts>;

      before(async () => {
        fetchArtifacts = getFetchArtifacts(
          endpointOpsAnalystSupertest,
          log,
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        );

        await disablePerPolicyEndpointExceptions(kbnServer);
      });

      beforeEach(async () => {
        await endpointArtifactTestResources.deleteList(
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        );

        await deleteExceptionList(
          endpointOpsAnalystSupertest,
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          'single'
        );
      });

      afterEach(async () => {
        await endpointArtifactTestResources.deleteList(
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        );

        await deleteExceptionList(
          endpointOpsAnalystSupertest,
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          'single'
        );
      });

      it('should add owner space id tag and global artifact tag if owner space ID is missing', async () => {
        await endpointOpsAnalystSupertest
          .post(`${EXCEPTION_LIST_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .attach(
            'file',
            buildImportBuffer(ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id, [
              { tags: [] },
              { tags: [] },
            ]),
            'import_exceptions.ndjson'
          )
          .expect(200);

        const items = await fetchArtifacts(CURRENT_SPACE_ID);

        expect(items.length).toEqual(2);
        for (const endpointException of items) {
          expect(endpointException.tags).toEqual([GLOBAL_ARTIFACT_TAG, CURRENT_SPACE_OWNER_TAG]);
        }
      });

      it('should add global artifact tag if it is missing', async () => {
        await endpointOpsAnalystSupertest
          .post(`${EXCEPTION_LIST_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .attach(
            'file',
            buildImportBuffer(ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id, [
              { tags: [CURRENT_SPACE_OWNER_TAG] },
              { tags: [CURRENT_SPACE_OWNER_TAG] },
            ]),
            'import_exceptions.ndjson'
          )
          .expect(200);

        const items = await fetchArtifacts(CURRENT_SPACE_ID);

        expect(items.length).toEqual(2);
        for (const endpointException of items) {
          expect(endpointException.tags).toEqual([CURRENT_SPACE_OWNER_TAG, GLOBAL_ARTIFACT_TAG]);
        }
      });

      it('should not add global artifact tag if namespace is "single"', async () => {
        await endpointArtifactTestResources.createList(
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        );

        await endpointOpsAnalystSupertest
          .post(`${EXCEPTION_LIST_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .attach(
            'file',
            buildImportBuffer(
              ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
              [{ namespace_type: 'single' }],
              'single'
            ),
            'import_exceptions.ndjson'
          )
          .expect(200);

        const items = await fetchArtifacts(CURRENT_SPACE_ID, 'single');
        expect(items.length).toEqual(1);
        expect(items[0].tags).not.toContain(GLOBAL_ARTIFACT_TAG);
      });
    });
  });
}

const getFetchArtifacts =
  (supertest: TestAgent, log: ToolingLog, listId: string) =>
  async (spaceId: string, namespace: 'agnostic' | 'single' = 'agnostic') => {
    const { body }: { body: FindExceptionListItemsResponse } = await supertest
      .get(addSpaceIdToPath('/', spaceId, `${EXCEPTION_LIST_ITEM_URL}/_find`))
      .set('kbn-xsrf', 'true')
      .on('error', createSupertestErrorLogger(log))
      .query({
        list_id: listId,
        namespace_type: namespace,
        sort_field: 'item_id',
        sort_order: 'asc',
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
  itemsArray: Partial<ExceptionListItemSchema>[] = [{}, {}, {}],
  listNamespace: 'agnostic' | 'single' = 'agnostic'
): Buffer => {
  const generator = new ExceptionsListItemGenerator();

  const items = itemsArray.map((override) => generator.generateEndpointArtifact(listId, override));

  return Buffer.from(
    `
      ${buildListInfo(listId, listNamespace)}
      ${items.map((item) => JSON.stringify(item)).join('\n')}
      ${JSON.stringify(buildDetails({ exported_exception_list_item_count: items.length }))}
      `,
    'utf8'
  );
};

const buildListInfo = (listId: string, namespace: 'agnostic' | 'single' = 'agnostic'): string => {
  const listInfo = Object.values(ENDPOINT_ARTIFACT_LISTS).find((listDefinition) => {
    return listDefinition.id === listId;
  }) ?? {
    id: listId,
    name: `random list for ${listId}`,
    description: `random description for ${listId}`,
  };

  return `{"_version":"WzEsMV0=","created_at":"2025-08-21T14:20:07.012Z","created_by":"kibana","description":"${listInfo.description}","id":"${listId}","immutable":false,"list_id":"${listId}","name":"${listInfo.name}","namespace_type":"${namespace}","os_types":[],"tags":[],"tie_breaker_id":"034d07f4-fa33-43bb-adfa-6f6bda7921ce","type":"endpoint","updated_at":"2025-08-21T14:20:07.012Z","updated_by":"kibana","version":1}`;
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

const deleteExceptionList = async (
  supertest: TestAgent,
  listId: string,
  namespace: 'single' | 'agnostic'
) =>
  supertest
    .delete(`${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=${namespace}`)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(({ status }) => expect([200, 404]).toContain(status));
