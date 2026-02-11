/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import {
  SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE,
  SCRIPTS_LIBRARY_ROUTE,
  SCRIPTS_LIBRARY_ROUTE_ITEM,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import type {
  EndpointScript,
  EndpointScriptApiResponse,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Endpoint Scripts Library', function () {
    const afterEachCleanupCallbacks: Array<() => void | Promise<unknown>> = [];
    let adminSupertest: TestAgent;

    const addScriptToAfterEachCleanup = (res: Response) => {
      if (res.ok) {
        const scriptId = (res.body as unknown as EndpointScriptApiResponse).data.id;

        if (scriptId) {
          log.debug(`Adding cleanup for scriptID: ${scriptId}`);

          afterEachCleanupCallbacks.push(async () => {
            log.debug(`Cleaning up scriptID: ${scriptId}`);

            await adminSupertest
              .delete(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
              .set('kbn-xsrf', 'true')
              .on('error', createSupertestErrorLogger(log).ignoreCodes([404]))
              .send()
              .then((response) => {
                if (!response.ok && !response.notFound) {
                  log.warning(`Failed to cleanup scriptID: ${scriptId}`, response.body);
                }
              })
              .catch((error) => {
                log.warning(`Failed to cleanup scriptID: ${scriptId}`, error);
              });
          });
        }
      }
    };
    const buildFileBuffer = (): Buffer => {
      return Buffer.from(`echo 'test script - ${Math.random().toString(32)}';`);
    };

    const createScript = async (): Promise<EndpointScript> => {
      const { body } = await adminSupertest
        .post(SCRIPTS_LIBRARY_ROUTE)
        .set('kbn-xsrf', 'true')
        .on('error', createSupertestErrorLogger(log))
        .on('response', addScriptToAfterEachCleanup)
        .field('name', 'test script')
        .field('platform', JSON.stringify(['linux']))
        .attach('file', buildFileBuffer(), 'script_file.sh')
        .expect(200);

      return (body as unknown as EndpointScriptApiResponse).data;
    };

    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    describe('RBAC', () => {
      let readScriptsSuperTest: TestAgent;
      let writeScriptsSuperTest: TestAgent;
      let noAccessScriptsSuperTest: TestAgent;

      before(async () => {
        readScriptsSuperTest = await utils.createSuperTestWithCustomRole({
          name: 'readScripts',
          privileges: rolesUsersProvider.buildRoleDefinition({
            securityPrivileges: ['scripts_management_read'],
          }),
        });

        writeScriptsSuperTest = await utils.createSuperTestWithCustomRole({
          name: 'writeScripts',
          privileges: rolesUsersProvider.buildRoleDefinition({
            securityPrivileges: ['scripts_management_all'],
          }),
        });

        noAccessScriptsSuperTest = await utils.createSuperTestWithCustomRole({
          name: 'noScriptsAccess',
          privileges: rolesUsersProvider.buildRoleDefinition(),
        });
      });

      after(async () => {
        await utils.cleanUpCustomRoles();
      });

      afterEach(async () => {
        if (afterEachCleanupCallbacks.length > 0) {
          await Promise.all(afterEachCleanupCallbacks.splice(0).map((callbackFn) => callbackFn()));
        }
      });

      describe('Create API', () => {
        it('should error when user has no privileges', async () => {
          await noAccessScriptsSuperTest
            .post(SCRIPTS_LIBRARY_ROUTE)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .on('response', addScriptToAfterEachCleanup)
            .field('name', 'test script')
            .field('platform', JSON.stringify(['linux']))
            .attach('file', buildFileBuffer(), 'script_file.sh')
            .expect(403);
        });

        it('should error when user only has READ privileges', async () => {
          await readScriptsSuperTest
            .post(SCRIPTS_LIBRARY_ROUTE)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .on('response', addScriptToAfterEachCleanup)
            .field('name', 'test script')
            .field('platform', JSON.stringify(['linux']))
            .attach('file', buildFileBuffer(), 'script_file.sh')
            .expect(403);
        });

        it('should create a new script when user has WRITE privileges', async () => {
          await writeScriptsSuperTest
            .post(SCRIPTS_LIBRARY_ROUTE)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .on('response', addScriptToAfterEachCleanup)
            .field('name', 'test script')
            .field('platform', JSON.stringify(['linux']))
            .attach('file', buildFileBuffer(), 'script_file.sh')
            .expect(200);
        });
      });

      describe('Update API', () => {
        let scriptId: string;

        beforeEach(async () => {
          await createScript().then(({ id }) => {
            scriptId = id;
          });
        });

        it('should error when user has no privileges', async () => {
          await noAccessScriptsSuperTest
            .patch(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .field('name', 'updated script')
            .expect(403);
        });

        it('should error when user only has READ privileges', async () => {
          await readScriptsSuperTest
            .patch(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .field('name', 'updated script')
            .expect(403);
        });

        it('should update script when user has WRITE privileges', async () => {
          await writeScriptsSuperTest
            .patch(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .field('name', 'updated script')
            .expect(200)
            .then(({ body }) => {
              expect((body as unknown as EndpointScriptApiResponse).data.name).to.eql(
                'updated script'
              );
            });
        });
      });

      describe('Delete API', () => {
        let scriptId: string;

        beforeEach(async () => {
          await createScript().then(({ id }) => {
            scriptId = id;
          });
        });

        it('should error when user has no privileges', async () => {
          await noAccessScriptsSuperTest
            .delete(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .expect(403);
        });

        it('should error when user has READ privileges', async () => {
          await readScriptsSuperTest
            .delete(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .expect(403);
        });

        it('should delete script when user has WRITE privileges', async () => {
          await writeScriptsSuperTest
            .delete(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });
      });

      describe('List API', () => {
        it('should error when user has no privileges privileges', async () => {
          await noAccessScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ROUTE)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .expect(403);
        });

        it('should return list of scripts when user has READ privileges', async () => {
          await readScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ROUTE)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });

        it('should return list of scripts when user has WRITE privileges', async () => {
          await writeScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ROUTE)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });
      });

      describe('Get one API', () => {
        let scriptId: string;

        beforeEach(async () => {
          await createScript().then(({ id }) => {
            scriptId = id;
          });
        });

        it('should error when user has no privileges', async () => {
          await noAccessScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .expect(403);
        });

        it('should return script when user has READ privileges', async () => {
          await readScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });

        it('should return script when user has WRITE privileges', async () => {
          await writeScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ROUTE_ITEM.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });
      });

      describe('Download API', () => {
        let scriptId: string;

        beforeEach(async () => {
          await createScript().then(({ id }) => {
            scriptId = id;
          });
        });

        it('should error when user has no privileges', async () => {
          await noAccessScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
            .expect(403);
        });

        it('should return script file download when user has READ privileges', async () => {
          await readScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });

        it('should return script file download when user has WRITE privileges', async () => {
          await writeScriptsSuperTest
            .get(SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE.replace('{script_id}', scriptId))
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log))
            .expect(200);
        });
      });
    });
  });
}
