/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import {
  SCRIPTS_LIBRARY_ROUTE,
  SCRIPTS_LIBRARY_ROUTE_ITEM,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import type { EndpointScriptApiResponse } from '@kbn/security-solution-plugin/common/endpoint/types';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Endpoint Scripts Library', function () {
    let adminSupertest: TestAgent;

    const buildFileBuffer = (): Buffer => {
      return Buffer.from(`echo 'test script - ${Math.random().toString(32)}';`);
    };

    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    describe('RBAC', () => {
      const afterEachCleanupCallbacks: Array<() => void | Promise<unknown>> = [];

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
                .on('error', createSupertestErrorLogger(log))
                .send()
                .expect(200)
                .catch((error) => {
                  log.warning(`Failed to cleanup scriptID: ${scriptId}`, error);
                });
            });
          }
        }
      };

      let readScriptsSuperTest: TestAgent;
      let writeScriptsSuperTest: TestAgent;
      let noAccessScriptsSuperTest: TestAgent;

      before(async () => {
        await Promise.all([
          rolesUsersProvider.loader.create(
            rolesUsersProvider.buildRoleDefinition({
              name: 'readScripts',
              securityPrivileges: ['scripts_management_read'],
            })
          ),
          rolesUsersProvider.loader.create(
            rolesUsersProvider.buildRoleDefinition({
              name: 'writeScripts',
              securityPrivileges: ['scripts_management_all'],
            })
          ),
          rolesUsersProvider.loader.create(
            rolesUsersProvider.buildRoleDefinition({ name: 'noScriptsAccess' })
          ),
        ]);

        readScriptsSuperTest = await utils.createSuperTest('readScripts');
        writeScriptsSuperTest = await utils.createSuperTest('writeScripts');
        noAccessScriptsSuperTest = await utils.createSuperTest('noScriptsAccess');
      });

      after(async () => {
        await Promise.all([
          rolesUsersProvider.loader.delete('readScripts'),
          rolesUsersProvider.loader.delete('writeScripts'),
          rolesUsersProvider.loader.delete('noScriptsAccess'),
        ]).catch((error) => {
          log.warning(`after(): attempt to clear up roles/users failed:`, error);
        });
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
        it('should error when user has no privileges', async () => {});

        it('should error when user only has READ privileges', async () => {});

        it('should update script when user has WRITE privileges', async () => {});
      });

      describe('Delete API', () => {
        it('should error when user has no privileges', async () => {});

        it('should error when user has READ privileges', async () => {});

        it('should delete script when user has WRITE privileges', async () => {});
      });

      describe('List API', () => {
        it('should error when user has no privileges privileges', async () => {});

        it('should return list of scripts when user has READ privileges', async () => {});

        it('should return list of scripts when user has WRITE privileges', async () => {});
      });

      describe('Get one API', () => {
        it('should error when user has no privileges', async () => {});

        it('should return script when user has READ privileges', async () => {});

        it('should return script when user has WRITE privileges', async () => {});
      });

      describe('Download API', () => {
        it('should error when user has no privileges', async () => {});

        it('should return script file download when user has READ privileges', async () => {});

        it('should return script file download when user has WRITE privileges', async () => {});
      });
    });
  });
}
