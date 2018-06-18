/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function SecurityPageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const defaultFindTimeout = config.get('timeouts.find');
  const PageObjects = getPageObjects(['common', 'header', 'settings']);

  class LoginPage {
    async login(username, password) {
      const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');

      username = username || superUsername;
      password = password || superPassword;

      await PageObjects.common.navigateToApp('login');
      await testSubjects.setValue('loginUsername', username);
      await testSubjects.setValue('loginPassword', password);
      await testSubjects.click('loginSubmit');
    }

    async getErrorMessage() {
      return await retry.try(async () => {
        const errorMessageContainer = await retry.try(() => testSubjects.find('loginErrorMessage'));
        const errorMessageText = await errorMessageContainer.getVisibleText();

        if (!errorMessageText) {
          throw new Error('Login Error Message not present yet');
        }

        return errorMessageText;
      });
    }
  }

  class SecurityPage {
    constructor() {
      this.loginPage = new LoginPage();
    }

    async initTests() {
      log.debug('SecurityPage:initTests');
      await esArchiver.load('empty_kibana');
      await kibanaServer.uiSettings.disableToastAutohide();
      await esArchiver.loadIfNeeded('logstash_functional');
      remote.setWindowSize(1600, 1000);
    }

    async login(username, password) {
      await this.loginPage.login(username, password);

      await retry.try(async () => {
        const logoutLinkExists = await find.existsByLinkText('Logout');
        if (!logoutLinkExists) {
          throw new Error('Login is not completed yet');
        }
      });
    }

    async logout() {
      log.debug('SecurityPage.logout');

      const logoutLinkExists = await find.existsByLinkText('Logout');
      if (!logoutLinkExists) {
        log.debug('Logout not found');
        return;
      }

      await find.clickByLinkText('Logout');

      await retry.try(async () => {
        const logoutLinkExists = await find.existsByDisplayedByCssSelector('.login-form');
        if (!logoutLinkExists) {
          throw new Error('Logout is not completed yet');
        }
      });
    }

    async clickRolesSection() {
      await PageObjects.settings.clickLinkText('Roles');
    }

    async clickUsersSection() {
      await PageObjects.settings.clickLinkText('Users');
    }

    async clickCreateNewUser() {
      await retry.try(() => testSubjects.click('createUserButton'));
    }

    async clickCreateNewRole() {
      await retry.try(() => testSubjects.click('createRoleButton'));
    }

    async getCreateIndexPatternInputFieldExists() {
      return await testSubjects.exists('createIndexPatternNameInput');
    }

    async clickCancelEditUser() {
      await testSubjects.click('userFormCancelButton');
    }

    async clickCancelEditRole() {
      await testSubjects.click('roleFormCancelButton');
    }

    async clickSaveEditUser() {
      const saveButton = await retry.try(() => testSubjects.find('userFormSaveButton'));
      await remote.moveMouseTo(saveButton);
      await saveButton.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSaveEditRole() {
      const saveButton = await retry.try(() => testSubjects.find('roleFormSaveButton'));
      await remote.moveMouseTo(saveButton);
      await saveButton.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async addIndexToRole(index) {
      log.debug(`Adding index ${index} to role`);
      const indexInput = await retry.try(() => find.byCssSelector('[data-test-subj="indicesInput0"] > div > input'));
      await indexInput.type(index);
      await indexInput.type('\n');
    }

    async addPrivilegeToRole(privilege) {
      log.debug(`Adding privilege ${privilege} to role`);
      const privilegeInput =
        await retry.try(() => find.byCssSelector('[data-test-subj="privilegesInput0"] > div > input'));
      await privilegeInput.type(privilege);
      await privilegeInput.type('\n');
    }

    async assignRoleToUser(role) {
      log.debug(`Adding role ${role} to user`);
      const privilegeInput =
        await retry.try(() => find.byCssSelector('[data-test-subj="userFormRolesDropdown"] > div > input'));
      await privilegeInput.type(role);
      await privilegeInput.type('\n');
    }

    async navigateTo() {
      await PageObjects.common.navigateToApp('settings');
    }

    clickElasticsearchUsers() {
      return this.navigateTo()
        .then(() => {
          return remote.setFindTimeout(defaultFindTimeout)
            .findDisplayedByLinkText('Users')
            .click();
        });
    }

    clickElasticsearchRoles() {
      return this.navigateTo()
        .then(() => {
          return remote.setFindTimeout(defaultFindTimeout)
            .findDisplayedByLinkText('Roles')
            .click();
        });
    }


    async getElasticsearchUsers() {
      const users = await testSubjects.findAll('userRow');
      return mapAsync(users, async user => {
        const fullnameElement = await user.findByCssSelector('[data-test-subj="userRowFullName"]');
        const usernameElement = await user.findByCssSelector('[data-test-subj="userRowUserName"]');
        const rolesElement = await user.findByCssSelector('[data-test-subj="userRowRoles"]');
        const isReservedElementVisible = await user.findByCssSelector('td:nth-child(5)');

        return {
          username: await usernameElement.getVisibleText(),
          fullname: await fullnameElement.getVisibleText(),
          roles: (await rolesElement.getVisibleText()).split(',').map(role => role.trim()),
          reserved: (await isReservedElementVisible.getProperty('innerHTML')).includes('userRowReserved')
        };
      });
    }

    async getElasticsearchRoles() {
      const users = await testSubjects.findAll('roleRow');
      return mapAsync(users, async role => {
        const rolenameElement = await role.findByCssSelector('[data-test-subj="roleRowName"]');
        const isReservedElementVisible =  await role.findByCssSelector('td:nth-child(3)');

        return  {
          rolename: await rolenameElement.getVisibleText(),
          reserved: (await isReservedElementVisible.getProperty('innerHTML')).includes('roleRowReserved')
        };
      });
    }

    async clickNewUser() {
      return await testSubjects.click('createUserButton');
    }

    async clickNewRole() {
      return await testSubjects.click('createRoleButton');
    }

    async addUser(userObj) {
      const self = this;
      await this.clickNewUser();
      await testSubjects.setValue('userFormUserNameInput', userObj.username);
      await testSubjects.setValue('passwordInput', userObj.password);
      await testSubjects.setValue('passwordConfirmationInput', userObj.confirmPassword);
      await testSubjects.setValue('userFormFullNameInput', userObj.fullname);
      await testSubjects.setValue('userFormEmailInput', userObj.email);

      function addRoles(role) {
        return role.reduce(function (promise, roleName) {
          return promise
            .then(function () {
              log.debug('Add role: ' + roleName);
              return self.selectRole(roleName);
            })
            .then(function () {
              return PageObjects.common.sleep(1000);
            });

        }, Promise.resolve());
      }
      log.debug('Add roles: ', userObj.roles);
      await addRoles(userObj.roles || []);
      log.debug('After Add role: , userObj.roleName');
      if (userObj.save === true) {
        await testSubjects.click('userFormSaveButton');
      } else {
        await testSubjects.click('userFormCancelButton');
      }
    }

    addRole(roleName, userObj) {
      return this.clickNewRole()
        .then(function () {
          // We have to use non-test-subject selectors because this markup is generated by ui-select.
          log.debug('userObj.indices[0].names = ' + userObj.indices[0].names);
          return testSubjects.append('roleFormNameInput', roleName);
        })
        .then(function () {
          return remote.setFindTimeout(defaultFindTimeout)
          // We have to use non-test-subject selectors because this markup is generated by ui-select.
            .findByCssSelector('[data-test-subj="indicesInput0"] .ui-select-search')
            .type(userObj.indices[0].names);
        })
        .then(function () {
          return remote.setFindTimeout(defaultFindTimeout)
          // We have to use non-test-subject selectors because this markup is generated by ui-select.
            .findByCssSelector('span.ui-select-choices-row-inner > div[ng-bind-html="indexPattern"]')
            .click();
        })
        .then(function () {
          if (userObj.indices[0].query) {
            return testSubjects.setValue('queryInput0', userObj.indices[0].query);
          }
        })
        .then(function () {

          function addPriv(priv) {

            return priv.reduce(function (promise, privName) {
              // We have to use non-test-subject selectors because this markup is generated by ui-select.
              return promise
                .then(function () {
                  return remote.setFindTimeout(defaultFindTimeout)
                    .findByCssSelector('[data-test-subj="privilegesInput0"] .ui-select-search')
                    .click();
                })
                .then(function () {
                  log.debug('priv item = ' + privName);
                  remote.setFindTimeout(defaultFindTimeout)
                    .findByCssSelector(`[data-test-subj="privilegeOption-${privName}"]`)
                    .click();
                })
                .then(function () {
                  return PageObjects.common.sleep(500);
                });

            }, Promise.resolve());
          }
          return addPriv(userObj.indices[0].privileges);
        })
        //clicking the Granted fields and removing the asterix
        .then(function () {

          function addGrantedField(field) {
            return field.reduce(function (promise, fieldName) {
              return promise
                .then(function () {
                  return remote.setFindTimeout(defaultFindTimeout)
                    .findByCssSelector('[data-test-subj="fieldInput0"] .ui-select-search')
                    .type(fieldName + '\t');
                })
                .then(function () {
                  return PageObjects.common.sleep(1000);
                });

            }, Promise.resolve());
          }

          if (userObj.indices[0].field_security) {
            // have to remove the '*'
            return remote.setFindTimeout(defaultFindTimeout)
              .findByCssSelector('div[data-test-subj="fieldInput0"] > div > span > span > span > span.ui-select-match-close')
              .click()
              .then(function () {
                return addGrantedField(userObj.indices[0].field_security.grant);
              });
          }
        })    //clicking save button
        .then(function () {
          log.debug('click save button');
          testSubjects.click('roleFormSaveButton');
        })
        .then(function () {
          return PageObjects.common.sleep(5000);
        });
    }

    async selectRole(role) {
      const dropdown = await testSubjects.find("userFormRolesDropdown");
      const input = await dropdown.findByCssSelector("input");
      await input.type(role);
      await testSubjects.click(`addRoleOption-${role}`);
      await testSubjects.find(`userRole-${role}`);
    }

    deleteUser(username) {
      let alertText;
      log.debug('Delete user ' + username);
      return remote.findDisplayedByLinkText(username).click()
        .then(() => {
          return PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        })
        .then(() => {
          log.debug('Find delete button and click');
          return testSubjects.click('userFormDeleteButton');
        })
        .then(() => {
          return PageObjects.common.sleep(2000);
        })
        .then (() => {
          return testSubjects.getVisibleText('confirmModalBodyText');
        })
        .then ((alert) => {
          alertText = alert;
          log.debug('Delete user alert text = ' + alertText);
          return testSubjects.click('confirmModalConfirmButton');
        })
        .then(() => {
          return alertText;
        });
    }

    getPermissionDeniedMessage() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findDisplayedByCssSelector('span.kuiInfoPanelHeader__title')
        .getVisibleText();
    }
  }
  return new SecurityPage();
}
