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
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type {
  ExportExceptionDetails,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import { buildSpaceOwnerIdTag } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/utils';
import type { Role } from '@kbn/security-plugin-types-common';
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
  const rolesUsersProvider = getService('rolesUsersProvider');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');
  const config = getService('config');

  const IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED = (
    config.get('kbnTestServer.serverArgs', []) as string[]
  )
    .find((s) => s.startsWith('--xpack.securitySolution.enableExperimental'))
    ?.includes('endpointExceptionsMovedUnderManagement');

  const createSupertestWithCustomRole = async (
    name: string,
    siemPrivileges: string[],
    spaces: string[] = ['*']
  ) => {
    const role = buildRole(name, siemPrivileges, spaces);

    // custom solution to have custom roles in both ess and serverless utils.
    // it'd be nice to have the same interface for both utils services in the future
    if ('createSuperTestWithCustomRole' in utils) {
      // serverless utils...
      return utils.createSuperTestWithCustomRole({
        name: role.name,
        privileges: {
          elasticsearch: role.elasticsearch,
          kibana: role.kibana,
        },
      });
    } else {
      // ess utils...
      const loadedRole = await rolesUsersProvider.loader.create(role);
      return utils.createSuperTest(loadedRole.username);
    }
  };

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

    if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
      describe('Endpoint exceptions move feature flag enabled', () => {
        const DEFAULT_SPACE_OWNER_ID = buildSpaceOwnerIdTag('default');

        const supertest: Record<
          (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
          Record<'none' | 'read' | 'all', TestAgent>
        > = {} as Record<
          (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
          Record<'none' | 'read' | 'all', TestAgent>
        >;

        before(async () => {
          for (const artifact of ENDPOINT_ARTIFACTS) {
            supertest[artifact.listId] = {
              none: await createSupertestWithCustomRole(`${artifact.listId}_none`, ['minimal_all']),
              read: await createSupertestWithCustomRole(`${artifact.listId}_read`, [
                'minimal_all',
                artifact.read,
              ]),
              all: await createSupertestWithCustomRole(`${artifact.listId}_all`, [
                'minimal_read',
                artifact.all,
              ]),
            };
          }
        });

        ENDPOINT_ARTIFACTS.forEach((artifact) => {
          describe(`Importing ${artifact.name}`, () => {
            beforeEach(async () => {
              await endpointArtifactTestResources.deleteList(artifact.listId);
            });

            describe('ALL privilege', () => {
              it(`should error when importing without artifact privileges`, async () => {
                await supertest[artifact.listId].none
                  .post(`${EXCEPTION_LIST_URL}/_import`)
                  .set('kbn-xsrf', 'true')
                  .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
                  .attach(
                    'file',
                    buildImportBuffer(artifact.listId, [DEFAULT_SPACE_OWNER_ID]),
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
                    buildImportBuffer(artifact.listId, [DEFAULT_SPACE_OWNER_ID]),
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
                    buildImportBuffer(artifact.listId, [DEFAULT_SPACE_OWNER_ID]),
                    'import_data.ndjson'
                  )
                  .expect(200);
              });
            });

            describe('Space awareness', () => {
              describe('when user has no global artifact privilege', () => {
                it('should import per-policy artifacts from current space', async () => {});
                it('should not import per-policy artifacts to other spaces when importing without global artifact privilege', async () => {});
                it('should not import global artifacts when importing without global artifact privilege', async () => {});
              });

              describe('when with global artifact privilege', () => {
                it(`should import global artifacts`, async () => {
                  await endpointOpsAnalystSupertest
                    .post(`${EXCEPTION_LIST_URL}/_import`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .attach(
                      'file',
                      buildImportBuffer(artifact.listId, [
                        DEFAULT_SPACE_OWNER_ID,
                        GLOBAL_ARTIFACT_TAG,
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

                  const { body } = await endpointOpsAnalystSupertest
                    .get(`${EXCEPTION_LIST_ITEM_URL}/_find`)
                    .set('kbn-xsrf', 'true')
                    .on('error', createSupertestErrorLogger(log))
                    .query({
                      list_id: artifact.listId,
                      namespace_type: 'agnostic',
                    })
                    .send()
                    .expect(200);

                  expect(body.data.length).to.eql(3);
                });
                it('should import per-policy artifacts to other space if assigned to policy in current space', async () => {});
                it('should not import per-policy artifacts to other space if not visible in current space', async () => {});
                it('should not import per-policy artifacts with invalid space id', async () => {});
              });

              describe('when `overwrite` query param is `true`', () => {
                describe('when without global artifact privilege', () => {
                  it('should remove existing per-policy artifacts only from the same space', async () => {});
                });

                describe('when with global artifact privilege', () => {
                  it('should remove existing global artifacts', async () => {});
                  it('should remove existing per-policy artifacts that are visible in current space', async () => {});
                });
              });

              it('should import per-policy artifacts assigned to non-existing policy', async () => {});
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
                        tags: [DEFAULT_SPACE_OWNER_ID],
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

            it('should error when `new_list` query param is `true`', async () => {});
            it('should add current space ID to artifacts without ownerSpaceId on import', async () => {});
            it('should add a comment to imported artifacts with relevant data', async () => {});
            it('should add a tag to imported artifacts', async () => {});
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

          await endpointArtifactTestResources.deleteList(
            ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
          );
        });
      });
    }
  });
}

const buildRole = (name: string, siemPrivileges: string[], spaces: string[] = ['*']): Role => ({
  name,
  kibana: [
    {
      base: [],
      feature: {
        [SECURITY_FEATURE_ID]: siemPrivileges,
      },
      spaces,
    },
  ],
  elasticsearch: { cluster: [], indices: [], run_as: [] },
});

const anEndpointArtifactErrorOf = (message: string) => (res: { body: { message: string } }) =>
  expect(res.body.message).to.be(`EndpointArtifactError: ${message}`);

const buildImportBuffer = (
  listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number],
  tags: string[] = []
): Buffer => {
  const generator = new ExceptionsListItemGenerator();

  const item1 = generator.generateEndpointArtifact(listId, { tags });
  const item2 = generator.generateEndpointArtifact(listId, { tags });
  const item3 = generator.generateEndpointArtifact(listId, { tags });

  return Buffer.from(
    `
      ${buildListInfo(listId)}
      ${JSON.stringify(item1)}
      ${JSON.stringify(item2)}
      ${JSON.stringify(item3)}
      ${JSON.stringify(buildDetails())}
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
