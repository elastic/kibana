/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { Role } from '../../../plugins/security/common/model';

export function SecurityPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const config = getService('config');
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const userMenu = getService('userMenu');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'home', 'error']);

  interface LoginOptions {
    expectSpaceSelector?: boolean;
    expectSuccess?: boolean;
    expectForbidden?: boolean;
  }

  type LoginExpectedResult = 'spaceSelector' | 'error' | 'chrome';

  async function waitForLoginPage() {
    log.debug('Waiting for Login Page to appear.');
    await retry.waitForWithTimeout('login page', config.get('timeouts.waitFor') * 5, async () => {
      // As a part of the cleanup flow tests usually try to log users out, but there are cases when
      // browser/Kibana would like users to confirm that they want to navigate away from the current
      // page and lose the state (e.g. unsaved changes) via native alert dialog.
      const alert = await browser.getAlert();
      if (alert && alert.accept) {
        await alert.accept();
      }
      return await find.existsByDisplayedByCssSelector('.login-form');
    });
  }

  async function waitForLoginForm() {
    log.debug('Waiting for Login Form to appear.');
    await retry.waitForWithTimeout('login form', config.get('timeouts.waitFor') * 5, async () => {
      return await testSubjects.exists('loginForm');
    });
  }

  async function waitForLoginSelector() {
    log.debug('Waiting for Login Selector to appear.');
    await retry.waitForWithTimeout(
      'login selector',
      config.get('timeouts.waitFor') * 5,
      async () => {
        return await testSubjects.exists('loginSelector');
      }
    );
  }

  async function waitForLoginHelp(helpText: string) {
    log.debug(`Waiting for Login Help to appear with text: ${helpText}.`);
    await retry.waitForWithTimeout('login help', config.get('timeouts.waitFor') * 5, async () => {
      return (await testSubjects.getVisibleText('loginHelp')) === helpText;
    });
  }

  async function waitForLoginResult(expectedResult?: LoginExpectedResult) {
    log.debug(`Waiting for login result, expected: ${expectedResult}.`);

    // wait for either space selector, kibanaChrome or loginErrorMessage
    if (expectedResult === 'spaceSelector') {
      await retry.try(() => testSubjects.find('kibanaSpaceSelector'));
      log.debug(
        `Finished login process, landed on space selector. currentUrl = ${await browser.getCurrentUrl()}`
      );
      return;
    }

    if (expectedResult === 'error') {
      const rawDataTabLocator = 'a[id=rawdata-tab]';
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
      return;
    }

    if (expectedResult === 'chrome') {
      await find.byCssSelector(
        '[data-test-subj="kibanaChrome"] .app-wrapper:not(.hidden-chrome)',
        20000
      );
      log.debug(`Finished login process currentUrl = ${await browser.getCurrentUrl()}`);
    }
  }

  const loginPage = Object.freeze({
    async login(username?: string, password?: string, options: LoginOptions = {}) {
      await PageObjects.common.navigateToApp('login');

      // ensure welcome screen won't be shown. This is relevant for environments which don't allow
      // to use the yml setting, e.g. cloud
      await browser.setLocalStorageItem('home:welcome:show', 'false');
      await waitForLoginForm();

      const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');
      await testSubjects.setValue('loginUsername', username || superUsername);
      await testSubjects.setValue('loginPassword', password || superPassword);
      await testSubjects.click('loginSubmit');

      await waitForLoginResult(
        options.expectSpaceSelector
          ? 'spaceSelector'
          : options.expectForbidden
          ? 'error'
          : options.expectSuccess
          ? 'chrome'
          : undefined
      );
    },

    async getErrorMessage() {
      return await retry.try(async () => {
        const errorMessageContainer = await retry.try(() => testSubjects.find('loginErrorMessage'));
        const errorMessageText = await errorMessageContainer.getVisibleText();

        if (!errorMessageText) {
          throw new Error('Login Error Message not present yet');
        }

        return errorMessageText;
      });
    },
  });

  const loginSelector = Object.freeze({
    async login(providerType: string, providerName: string, options?: Record<string, any>) {
      log.debug(`Starting login flow for ${providerType}/${providerName}`);

      await this.verifyLoginSelectorIsVisible();
      await this.selectLoginMethod(providerType, providerName);

      if (providerType === 'basic' || providerType === 'token') {
        await waitForLoginForm();

        const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');
        await testSubjects.setValue('loginUsername', options?.username ?? superUsername);
        await testSubjects.setValue('loginPassword', options?.password ?? superPassword);
        await testSubjects.click('loginSubmit');
      }

      await waitForLoginResult('chrome');

      log.debug(`Finished login process currentUrl = ${await browser.getCurrentUrl()}`);
    },

    async selectLoginMethod(providerType: string, providerName: string) {
      // Ensure welcome screen won't be shown. This is relevant for environments which don't allow
      // to use the yml setting, e.g. cloud.
      await browser.setLocalStorageItem('home:welcome:show', 'false');
      await testSubjects.click(`loginCard-${providerType}/${providerName}`);
    },

    async verifyLoginFormIsVisible() {
      await waitForLoginForm();
    },

    async verifyLoginSelectorIsVisible() {
      await waitForLoginSelector();
    },

    async verifyLoginHelpIsVisible(helpText: string) {
      await waitForLoginHelp(helpText);
    },
  });

  class SecurityPage {
    public loginPage = loginPage;
    public loginSelector = loginSelector;

    async initTests() {
      log.debug('SecurityPage:initTests');
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('logstash_functional');
      await browser.setWindowSize(1600, 1000);
    }

    async login(username?: string, password?: string, options: LoginOptions = {}) {
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
      await waitForLoginPage();
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
      await waitForLoginPage();
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

    async clickCloneRole(roleName: string) {
      await retry.try(() => testSubjects.click(`clone-role-action-${roleName}`));
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

    async addIndexToRole(index: string) {
      log.debug(`Adding index ${index} to role`);
      await comboBox.setCustom('indicesInput0', index);
    }

    async addPrivilegeToRole(privilege: string) {
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

    async assignRoleToUser(role: string) {
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
      const users = [];
      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click('tablePagination-100-rows');
      for (const user of await testSubjects.findAll('userRow')) {
        const fullnameElement = await user.findByTestSubject('userRowFullName');
        const usernameElement = await user.findByTestSubject('userRowUserName');
        const emailElement = await user.findByTestSubject('userRowEmail');
        const rolesElement = await user.findByTestSubject('userRowRoles');
        // findAll is substantially faster than `find.descendantExistsByCssSelector for negative cases
        const isUserReserved = (await user.findAllByTestSubject('userReserved', 1)).length > 0;
        const isUserDeprecated = (await user.findAllByTestSubject('userDeprecated', 1)).length > 0;

        users.push({
          username: await usernameElement.getVisibleText(),
          fullname: await fullnameElement.getVisibleText(),
          email: await emailElement.getVisibleText(),
          roles: (await rolesElement.getVisibleText()).split('\n').map((role) => role.trim()),
          reserved: isUserReserved,
          deprecated: isUserDeprecated,
        });
      }

      return users;
    }

    async getElasticsearchRoles() {
      const roles = [];
      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click('tablePagination-100-rows');
      for (const role of await testSubjects.findAll('roleRow')) {
        const [rolename, reserved, deprecated] = await Promise.all([
          role.findByTestSubject('roleRowName').then((el) => el.getVisibleText()),
          // findAll is substantially faster than `find.descendantExistsByCssSelector for negative cases
          role.findAllByTestSubject('roleReserved', 1).then((el) => el.length > 0),
          // findAll is substantially faster than `find.descendantExistsByCssSelector for negative cases
          role.findAllByTestSubject('roleDeprecated', 1).then((el) => el.length > 0),
        ]);

        roles.push({ rolename, reserved, deprecated });
      }

      return roles;
    }

    async clickNewUser() {
      return await testSubjects.click('createUserButton');
    }

    async clickNewRole() {
      return await testSubjects.click('createRoleButton');
    }

    async addUser(userObj: {
      username: string;
      password: string;
      confirmPassword: string;
      email: string;
      fullname: string;
      roles: string[];
      save?: boolean;
    }) {
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

    async addRole(roleName: string, roleObj: Role) {
      const self = this;

      await this.clickNewRole();

      // We have to use non-test-subject selectors because this markup is generated by ui-select.
      log.debug('roleObj.indices[0].names = ' + roleObj.elasticsearch.indices[0].names);
      await testSubjects.append('roleFormNameInput', roleName);

      for (const indexName of roleObj.elasticsearch.indices[0].names) {
        await comboBox.setCustom('indicesInput0', indexName);
      }

      if (roleObj.elasticsearch.indices[0].query) {
        await testSubjects.click('restrictDocumentsQuery0');
        await testSubjects.setValue('queryInput0', roleObj.elasticsearch.indices[0].query);
      }

      const globalPrivileges = (roleObj.kibana as any).global;
      if (globalPrivileges) {
        for (const privilegeName of globalPrivileges) {
          await testSubjects.click('addSpacePrivilegeButton');

          await testSubjects.click('spaceSelectorComboBox');

          const globalSpaceOption = await find.byCssSelector(`#spaceOption_\\*`);
          await globalSpaceOption.click();

          await testSubjects.click('basePrivilegeComboBox');

          const privilegeOption = await find.byCssSelector(`#basePrivilege_${privilegeName}`);
          await privilegeOption.click();

          await testSubjects.click('createSpacePrivilegeButton');
        }
      }

      function addPrivilege(privileges: string[]) {
        return privileges.reduce(function (promise: Promise<any>, privilegeName: string) {
          return promise
            .then(() => self.addPrivilegeToRole(privilegeName))
            .then(() => PageObjects.common.sleep(250));
        }, Promise.resolve());
      }

      await addPrivilege(roleObj.elasticsearch.indices[0].privileges);

      async function addGrantedField(fields: string[]) {
        for (const entry of fields) {
          await comboBox.setCustom('fieldInput0', entry);
        }
      }

      // clicking the Granted fields and removing the asterix
      if (roleObj.elasticsearch.indices[0].field_security) {
        // Toggle FLS switch
        await testSubjects.click('restrictFieldsQuery0');

        // have to remove the '*'
        await find.clickByCssSelector(
          'div[data-test-subj="fieldInput0"] [title="Remove * from selection in this group"] svg.euiIcon'
        );

        await addGrantedField(roleObj.elasticsearch.indices[0].field_security!.grant!);
      }

      log.debug('click save button');
      await testSubjects.click('roleFormSaveButton');

      // Signifies that the role management page redirected back to the role grid page,
      // and successfully refreshed the grid
      await testSubjects.existOrFail('roleRow');
    }

    async selectRole(role: string) {
      const dropdown = await testSubjects.find('rolesDropdown');
      const input = await dropdown.findByCssSelector('input');
      await input.type(role);
      await testSubjects.click(`roleOption-${role}`);
      await testSubjects.click('comboBoxToggleListButton');
      await testSubjects.find(`roleOption-${role}`);
    }

    deleteUser(username: string) {
      let alertText: string;
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
        .then((alert) => {
          alertText = alert;
          log.debug('Delete user alert text = ' + alertText);
          return testSubjects.click('confirmModalConfirmButton');
        })
        .then(() => {
          return alertText;
        });
    }
  }
  return new SecurityPage();
}
