/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REPO_ROOT } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { load as repoLoad, unload as repoUnload } from './repo_archiver';

export default function testWithSecurity({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home', 'settings']);
  const dummyPassword = '123321';
  const codeAdmin = 'codeAdmin';
  const codeUser = 'codeUser';
  const repositoryListSelector = 'codeRepositoryList > codeRepositoryItem';
  const manageButtonSelectors = ['indexRepositoryButton', 'deleteRepositoryButton'];
  const log = getService('log');
  const security = getService('security');
  const config = getService('config');

  describe('Security', () => {
    describe('with security enabled:', () => {
      before(async () => {
        await esArchiver.load('empty_kibana');
        await security.role.create('global_code_all_role', {
          kibana: [
            {
              feature: {
                code: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(codeAdmin, {
          password: dummyPassword,
          roles: ['global_code_all_role'],
          full_name: 'code admin',
        });

        await security.role.create('global_code_read_role', {
          kibana: [
            {
              feature: {
                code: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(codeUser, {
          password: dummyPassword,
          roles: ['global_code_read_role'],
          full_name: 'code user',
        });
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await esArchiver.unload('empty_kibana');
      });

      async function login(user: string) {
        await PageObjects.security.forceLogout();
        await PageObjects.security.login(user, dummyPassword);
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();
      }

      it('codeAdmin should have an import button', async () => {
        await login(codeAdmin);
        await retry.tryForTime(5000, async () => {
          const buttons = await testSubjects.findAll('importRepositoryButton');
          expect(buttons).to.have.length(1);
        });
      });
      it('codeUser should not have that import button', async () => {
        await login(codeUser);
        await retry.tryForTime(5000, async () => {
          const buttons = await testSubjects.findAll('importRepositoryButton');
          expect(buttons).to.have.length(0);
        });
      });

      it('only codeAdmin can manage repositories', async () => {
        await repoLoad(
          'github.com/elastic/TypeScript-Node-Starter',
          'typescript_node_starter',
          config.get('kbnTestServer.installDir') || REPO_ROOT
        );
        await esArchiver.load('code/repositories/typescript_node_starter');

        {
          await login(codeAdmin);
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          for (const buttonSelector of manageButtonSelectors) {
            const buttons = await testSubjects.findAll(buttonSelector);
            expect(buttons).to.have.length(1);
            log.debug(`button ${buttonSelector} found.`);
          }
          const importButton = await testSubjects.findAll('newProjectButton');
          expect(importButton).to.have.length(1);
          log.debug(`button newProjectButton found.`);
        }

        {
          await login(codeUser);
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          for (const buttonSelector of manageButtonSelectors) {
            const buttons = await testSubjects.findAll(buttonSelector);
            expect(buttons).to.have.length(0);
          }
          const importButton = await testSubjects.findAll('newProjectButton');
          expect(importButton).to.have.length(0);
        }

        await esArchiver.unload('code/repositories/typescript_node_starter');
        await repoUnload(
          'github.com/elastic/TypeScript-Node-Starter',
          config.get('kbnTestServer.installDir') || REPO_ROOT
        );
      });
    });
  });
}
