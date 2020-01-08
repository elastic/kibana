/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function SecurityPageProvider({ getService, getPageObjects }) {
  const browser = getService('browser');
  const config = getService('config');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const userMenu = getService('userMenu');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'home', 'error']);

  class LoginPage {
    async login(username, password, options = {}) {
      const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');

      username = username || superUsername;
      password = password || superPassword;

      const expectSpaceSelector = options.expectSpaceSelector || false;
      const expectSuccess = options.expectSuccess;
      const expectForbidden = options.expectForbidden || false;
      const rawDataTabLocator = 'a[id=rawdata-tab]';

      await PageObjects.common.navigateToApp('login');
      await testSubjects.setValue('loginUsername', username);
      await testSubjects.setValue('loginPassword', password);
      await testSubjects.click('loginSubmit');

      // wait for either space selector, kibanaChrome or loginErrorMessage
      if (expectSpaceSelector) {
        await retry.try(() => testSubjects.find('kibanaSpaceSelector'));
        log.debug(
          `Finished login process, landed on space selector. currentUrl = ${await browser.getCurrentUrl()}`
        );
      } else if (expectForbidden) {
        if (await find.existsByCssSelector(rawDataTabLocator)) {
          // Firefox has 3 tabs and requires navigation to see Raw output
          await find.clickByCssSelector(rawDataTabLocator);
        }
        await retry.try(async () => {
          if (await find.existsByCssSelector(rawDataTabLocator)) {
            await find.clickByCssSelector(rawDataTabLocator);
          }
          await PageObjects.error.expectForbidden();
        });
        log.debug(
          `Finished login process, found forbidden message. currentUrl = ${await browser.getCurrentUrl()}`
        );
      } else if (expectSuccess) {
        await find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
        log.debug(`Finished login process currentUrl = ${await browser.getCurrentUrl()}`);
      }
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
      await esArchiver.loadIfNeeded('logstash_functional');
      await browser.setWindowSize(1600, 1000);
    }

    async login(username, password, options = {}) {
      await this.loginPage.login(username, password, options);

      if (options.expectSpaceSelector || options.expectForbidden) {
        return;
      }

      await retry.waitFor('logout button visible', async () => await userMenu.logoutLinkExists());
    }

    async logout() {
      log.debug('SecurityPage.logout');

      if (!(await userMenu.logoutLinkExists())) {
        log.debug('Logout not found');
        return;
      }

      await userMenu.clickLogoutButton();

      await retry.waitForWithTimeout(
        'login form',
        config.get('timeouts.waitFor') * 5,
        async () => await find.existsByDisplayedByCssSelector('.login-form')
      );
    }

    async forceLogout() {
      log.debug('SecurityPage.forceLogout');
      if (await find.existsByDisplayedByCssSelector('.login-form', 100)) {
        log.debug('Already on the login page, not forcing anything');
        return;
      }

      log.debug('Redirecting to /logout to force the logout');
      const url = PageObjects.common.getHostPort() + '/logout';
      await browser.get(url);
      log.debug('Waiting on the login form to appear');
      await retry.waitForWithTimeout(
        'login form',
        config.get('timeouts.waitFor') * 5,
        async () => await find.existsByDisplayedByCssSelector('.login-form')
      );
    }

    async clickRolesSection() {
      await testSubjects.click('roles');
    }

    async clickUsersSection() {
      await testSubjects.click('users');
    }

    async clickCreateNewUser() {
      await retry.try(() => testSubjects.click('createUserButton'));
    }

    async clickCreateNewRole() {
      await retry.try(() => testSubjects.click('createRoleButton'));
    }

    async clickCloneRole(roleName) {
      await retry.try(() => testSubjects.click(`clone-role-action-${roleName}`));
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
      await testSubjects.click('userFormSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSaveEditRole() {
      const saveButton = await retry.try(() => testSubjects.find('roleFormSaveButton'));
      await saveButton.moveMouseTo();
      await saveButton.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async addIndexToRole(index) {
      log.debug(`Adding index ${index} to role`);
      const indexInput = await retry.try(() =>
        find.byCssSelector('[data-test-subj="indicesInput0"] input')
      );
      await indexInput.type(index);
      await indexInput.type('\n');
    }

    async addPrivilegeToRole(privilege) {
      log.debug(`Adding privilege ${privilege} to role`);
      const privilegeInput = await retry.try(() =>
        find.byCssSelector('[data-test-subj="privilegesInput0"] input')
      );
      await privilegeInput.type(privilege);

      const btn = await find.byButtonText(privilege);
      await btn.click();

      // const options = await find.byCssSelector(`.euiFilterSelectItem`);
      // Object.entries(options).forEach(([key, prop]) => {
      //   console.log({ key, proto: prop.__proto__ });
      // });

      // await options.click();
    }

    async assignRoleToUser(role) {
      await this.selectRole(role);
    }

    async navigateTo() {
      await PageObjects.common.navigateToApp('settings');
    }

    async clickElasticsearchUsers() {
      await this.navigateTo();
      await this.clickUsersSection();
    }

    async clickElasticsearchRoles() {
      await this.navigateTo();
      await this.clickRolesSection();
    }

    async getElasticsearchUsers() {
      const users = await testSubjects.findAll('userRow');
      return mapAsync(users, async user => {
        const fullnameElement = await user.findByCssSelector('[data-test-subj="userRowFullName"]');
        const usernameElement = await user.findByCssSelector('[data-test-subj="userRowUserName"]');
        const emailElement = await user.findByCssSelector('[data-test-subj="userRowEmail"]');
        const rolesElement = await user.findByCssSelector('[data-test-subj="userRowRoles"]');
        const isReservedElementVisible = await user.findByCssSelector('td:last-child');

        return {
          username: await usernameElement.getVisibleText(),
          fullname: await fullnameElement.getVisibleText(),
          email: await emailElement.getVisibleText(),
          roles: (await rolesElement.getVisibleText()).split(',').map(role => role.trim()),
          reserved: (await isReservedElementVisible.getAttribute('innerHTML')).includes(
            'reservedUser'
          ),
        };
      });
    }

    async getElasticsearchRoles() {
      const users = await testSubjects.findAll('roleRow');
      return mapAsync(users, async role => {
        const rolenameElement = await role.findByCssSelector('[data-test-subj="roleRowName"]');
        const reservedRoleRow = await role.findByCssSelector('td:nth-last-child(2)');

        return {
          rolename: await rolenameElement.getVisibleText(),
          reserved: await find.descendantExistsByCssSelector(
            '[data-test-subj="reservedRole"]',
            reservedRoleRow
          ),
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
      log.debug('username = ' + userObj.username);
      await testSubjects.setValue('userFormUserNameInput', userObj.username);
      await testSubjects.setValue('passwordInput', userObj.password);
      await testSubjects.setValue('passwordConfirmationInput', userObj.confirmPassword);
      if (userObj.fullname) {
        await testSubjects.setValue('userFormFullNameInput', userObj.fullname);
      }
      if (userObj.email) {
        await testSubjects.setValue('userFormEmailInput', userObj.email);
      }

      log.debug('Add roles: ', userObj.roles);
      const rolesToAdd = userObj.roles || [];
      for (let i = 0; i < rolesToAdd.length; i++) {
        await self.selectRole(rolesToAdd[i]);
      }
      log.debug('After Add role: , userObj.roleName');
      if (userObj.save === true) {
        await testSubjects.click('userFormSaveButton');
      } else {
        await testSubjects.click('userFormCancelButton');
      }
    }

    addRole(roleName, userObj) {
      const self = this;

      return (
        this.clickNewRole()
          .then(function() {
            // We have to use non-test-subject selectors because this markup is generated by ui-select.
            log.debug('userObj.indices[0].names = ' + userObj.elasticsearch.indices[0].names);
            return testSubjects.append('roleFormNameInput', roleName);
          })
          .then(function() {
            return find.setValue(
              '[data-test-subj="indicesInput0"] input',
              userObj.elasticsearch.indices[0].names + '\n'
            );
          })
          .then(function() {
            return testSubjects.click('restrictDocumentsQuery0');
          })
          .then(function() {
            if (userObj.elasticsearch.indices[0].query) {
              return testSubjects.setValue('queryInput0', userObj.elasticsearch.indices[0].query);
            }
          })

          //KibanaPriv
          .then(function() {
            function addKibanaPriv(priv) {
              return priv.reduce(async function(promise, privName) {
                const button = await testSubjects.find('addSpacePrivilegeButton');
                await button.click();

                const spaceSelector = await testSubjects.find('spaceSelectorComboBox');
                await spaceSelector.click();

                const globalSpaceOption = await find.byCssSelector(`#spaceOption_\\*`);
                await globalSpaceOption.click();

                const basePrivilegeSelector = await testSubjects.find('basePrivilegeComboBox');
                await basePrivilegeSelector.click();

                const privilegeOption = await find.byCssSelector(`#basePrivilege_${privName}`);
                await privilegeOption.click();

                const createPrivilegeButton = await testSubjects.find('createSpacePrivilegeButton');
                await createPrivilegeButton.click();

                return promise;
              }, Promise.resolve());
            }
            return userObj.kibana.global ? addKibanaPriv(userObj.kibana.global) : Promise.resolve();
          })

          .then(function() {
            function addPriv(priv) {
              return priv.reduce(function(promise, privName) {
                // We have to use non-test-subject selectors because this markup is generated by ui-select.
                return promise
                  .then(() => self.addPrivilegeToRole(privName))
                  .then(() => PageObjects.common.sleep(250));
              }, Promise.resolve());
            }
            return addPriv(userObj.elasticsearch.indices[0].privileges);
          })
          //clicking the Granted fields and removing the asterix
          .then(async function() {
            function addGrantedField(field) {
              return field.reduce(function(promise, fieldName) {
                return promise
                  .then(function() {
                    return find.setValue('[data-test-subj="fieldInput0"] input', fieldName + '\n');
                  })
                  .then(function() {
                    return PageObjects.common.sleep(1000);
                  });
              }, Promise.resolve());
            }

            if (userObj.elasticsearch.indices[0].field_security) {
              // Toggle FLS switch
              await testSubjects.click('restrictFieldsQuery0');

              // have to remove the '*'
              return find
                .clickByCssSelector(
                  'div[data-test-subj="fieldInput0"] .euiBadge[title="*"] svg.euiIcon'
                )
                .then(function() {
                  return addGrantedField(userObj.elasticsearch.indices[0].field_security.grant);
                });
            }
          }) //clicking save button
          .then(function() {
            log.debug('click save button');
            testSubjects.click('roleFormSaveButton');
          })
          .then(function() {
            return PageObjects.common.sleep(5000);
          })
      );
    }

    async selectRole(role) {
      const dropdown = await testSubjects.find('userFormRolesDropdown');
      const input = await dropdown.findByCssSelector('input');
      await input.type(role);
      await testSubjects.click(`roleOption-${role}`);
      await testSubjects.click('comboBoxToggleListButton');
      await testSubjects.find(`roleOption-${role}`);
    }

    deleteUser(username) {
      let alertText;
      log.debug('Delete user ' + username);
      return find
        .clickByDisplayedLinkText(username)
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
        .then(() => {
          return testSubjects.getVisibleText('confirmModalBodyText');
        })
        .then(alert => {
          alertText = alert;
          log.debug('Delete user alert text = ' + alertText);
          return testSubjects.click('confirmModalConfirmButton');
        })
        .then(() => {
          return alertText;
        });
    }

    async getPermissionDeniedMessage() {
      const el = await find.displayedByCssSelector('span.kuiInfoPanelHeader__title');
      return await el.getVisibleText();
    }
  }
  return new SecurityPage();
}
