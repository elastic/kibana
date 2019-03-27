/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
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

  describe('with security enabled:', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      await PageObjects.settings.navigateTo();
      await PageObjects.security.clickElasticsearchUsers();
      await PageObjects.security.addUser({
        username: codeAdmin,
        password: dummyPassword,
        confirmPassword: dummyPassword,
        fullname: 'Code Admin',
        email: 'codeAdmin@elastic.co',
        save: true,
        roles: ['kibana_user', 'code_admin'],
      });
      await PageObjects.security.addUser({
        username: codeUser,
        password: '123321',
        confirmPassword: dummyPassword,
        fullname: 'Code User',
        email: 'codeUser@elastic.co',
        save: true,
        roles: ['kibana_user', 'code_user'],
      });
      // Navigate to the search page of the code app.
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
      await retry.tryForTime(30000, async () => {
        const repositoryItems = await testSubjects.findAll(repositoryListSelector);
        if (repositoryItems.length > 0) {
          const deleteButton = await testSubjects.findAll('deleteRepositoryButton');
          if (deleteButton.length > 0) {
            await PageObjects.code.clickDeleteRepositoryButton();
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
}
