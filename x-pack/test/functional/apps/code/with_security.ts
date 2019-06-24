/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { TestInvoker } from './lib/types';

// eslint-disable-next-line import/no-default-export
export default function testWithSecurity({ getService, getPageObjects }: TestInvoker) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home', 'settings']);
  const dummyPassword = '123321';
  const codeAdmin = 'codeAdmin';
  const codeUser = 'codeUser';
  const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';
  const manageButtonSelectors = ['indexRepositoryButton', 'deleteRepositoryButton'];
  const log = getService('log');
  const security = getService('security');

  describe('Security', () => {
    describe('with security enabled:', () => {
      before(async () => {
        await esArchiver.load('empty_kibana');
        await security.role.create('global_code_all_role', {
          elasticsearch: {
            indices: [],
          },
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
          elasticsearch: {
            indices: [],
          },
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

      async function login(user: string) {
        await PageObjects.security.logout();
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
        await login(codeAdmin);
        await retry.tryForTime(5000, async () => {
          const buttons = await testSubjects.findAll('importRepositoryButton');
          expect(buttons).to.have.length(1);
        });
        await PageObjects.code.fillImportRepositoryUrlInputBox(
          'https://github.com/Microsoft/TypeScript-Node-Starter'
        );
        // Click the import repository button.
        await PageObjects.code.clickImportRepositoryButton();

        await retry.tryForTime(300000, async () => {
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
        });

        await login(codeUser);
        await retry.tryForTime(5000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          for (const buttonSelector of manageButtonSelectors) {
            const buttons = await testSubjects.findAll(buttonSelector);
            expect(buttons).to.have.length(0);
          }
          const importButton = await testSubjects.findAll('newProjectButton');
          expect(importButton).to.have.length(0);
        });
      });

      async function cleanProjects() {
        // remove imported project
        await login(codeAdmin);
        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          if (repositoryItems.length > 0) {
            const deleteButton = await testSubjects.findAll('deleteRepositoryButton');
            if (deleteButton.length > 0) {
              await PageObjects.code.clickDeleteRepositoryButton();
              await retry.try(async () => {
                expect(await testSubjects.exists('confirmModalConfirmButton')).to.be(true);
              });

              await testSubjects.click('confirmModalConfirmButton');
            }
          }
          expect(repositoryItems).to.have.length(0);
        });
      }

      after(async () => {
        await cleanProjects();
        await PageObjects.security.logout();
        await esArchiver.unload('code');
      });
    });
  });
}
