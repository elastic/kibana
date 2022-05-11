/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adminTestUser } from '@kbn/test';
import { AuthenticatedUser, Role } from '@kbn/security-plugin/common/model';
import type { UserFormValues } from '@kbn/security-plugin/public/management/users/edit_user/user_form';
import { FtrService } from '../ftr_provider_context';

interface LoginOptions {
  expectSpaceSelector?: boolean;
  expectSuccess?: boolean;
  expectForbidden?: boolean;
}

type LoginExpectedResult =
  | 'spaceSelector'
  | 'error'
  | 'chrome'
  | (() => unknown | Promise<unknown>);

export class SecurityPageObject extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly config = this.ctx.getService('config');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly esArchiver = this.ctx.getService('esArchiver');
  private readonly userMenu = this.ctx.getService('userMenu');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly supertest = this.ctx.getService('supertestWithoutAuth');
  private readonly deployment = this.ctx.getService('deployment');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');

  public loginPage = Object.freeze({
    login: async (username?: string, password?: string, options: LoginOptions = {}) => {
      if (!(await this.isLoginFormVisible())) {
        await this.common.navigateToApp('login');
      }

      // ensure welcome screen won't be shown. This is relevant for environments which don't allow
      // to use the yml setting, e.g. cloud
      await this.browser.setLocalStorageItem('home:welcome:show', 'false');
      await this.waitForLoginForm();

      await this.testSubjects.setValue('loginUsername', username || adminTestUser.username);
      await this.testSubjects.setValue('loginPassword', password || adminTestUser.password);
      await this.testSubjects.click('loginSubmit');

      await this.waitForLoginResult(
        options.expectSpaceSelector
          ? 'spaceSelector'
          : options.expectForbidden
          ? 'error'
          : options.expectSuccess
          ? 'chrome'
          : undefined
      );
    },

    getErrorMessage: async () => {
      return await this.retry.try(async () => {
        const errorMessageContainer = await this.retry.try(() =>
          this.testSubjects.find('loginErrorMessage')
        );
        const errorMessageText = await errorMessageContainer.getVisibleText();

        if (!errorMessageText) {
          throw new Error('Login Error Message not present yet');
        }

        return errorMessageText;
      });
    },
  });

  public loginSelector = Object.freeze({
    login: async (
      providerType: string,
      providerName: string,
      options?: Omit<Record<string, any>, 'expectedLoginResult'> & {
        expectedLoginResult?: LoginExpectedResult;
      }
    ) => {
      this.log.debug(`Starting login flow for ${providerType}/${providerName}`);

      await this.loginSelector.verifyLoginSelectorIsVisible();
      await this.loginSelector.selectLoginMethod(providerType, providerName);

      if (providerType === 'basic' || providerType === 'token') {
        await this.waitForLoginForm();

        await this.testSubjects.setValue(
          'loginUsername',
          options?.username ?? adminTestUser.username
        );
        await this.testSubjects.setValue(
          'loginPassword',
          options?.password ?? adminTestUser.password
        );
        await this.testSubjects.click('loginSubmit');
      }

      await this.waitForLoginResult(options?.expectedLoginResult ?? 'chrome');

      this.log.debug(`Finished login process currentUrl = ${await this.browser.getCurrentUrl()}`);
    },

    selectLoginMethod: async (providerType: string, providerName: string) => {
      // Ensure welcome screen won't be shown. This is relevant for environments which don't allow
      // to use the yml setting, e.g. cloud.
      await this.browser.setLocalStorageItem('home:welcome:show', 'false');
      await this.testSubjects.click(`loginCard-${providerType}/${providerName}`);
    },

    verifyLoginFormIsVisible: async () => {
      await this.waitForLoginForm();
    },

    verifyLoginSelectorIsVisible: async () => {
      await this.waitForLoginSelector();
    },

    verifyLoginHelpIsVisible: async (helpText: string) => {
      await this.waitForLoginHelp(helpText);
    },
  });

  private async waitForLoginPage() {
    this.log.debug('Waiting for Login Page to appear.');
    await this.retry.waitForWithTimeout(
      'login page',
      this.config.get('timeouts.waitFor') * 5,
      async () => {
        // As a part of the cleanup flow tests usually try to log users out, but there are cases when
        // browser/Kibana would like users to confirm that they want to navigate away from the current
        // page and lose the state (e.g. unsaved changes) via native alert dialog.
        const alert = await this.browser.getAlert();
        if (alert && alert.accept) {
          await alert.accept();
        }
        return await this.find.existsByDisplayedByCssSelector('.login-form');
      }
    );
  }

  private async isLoginFormVisible() {
    return await this.testSubjects.exists('loginForm');
  }

  private async waitForLoginForm() {
    this.log.debug('Waiting for Login Form to appear.');
    await this.retry.waitForWithTimeout(
      'login form',
      this.config.get('timeouts.waitFor') * 5,
      async () => {
        return await this.isLoginFormVisible();
      }
    );
  }

  private async waitForLoginSelector() {
    this.log.debug('Waiting for Login Selector to appear.');
    await this.retry.waitForWithTimeout(
      'login selector',
      this.config.get('timeouts.waitFor') * 5,
      async () => {
        return await this.testSubjects.exists('loginSelector');
      }
    );
  }

  private async waitForLoginHelp(helpText: string) {
    this.log.debug(`Waiting for Login Help to appear with text: ${helpText}.`);
    await this.retry.waitForWithTimeout(
      'login help',
      this.config.get('timeouts.waitFor') * 5,
      async () => {
        return (await this.testSubjects.getVisibleText('loginHelp')) === helpText;
      }
    );
  }

  private async waitForLoginResult(expectedResult?: LoginExpectedResult) {
    this.log.debug(`Waiting for login result, expected: ${expectedResult}.`);

    // wait for either space selector, kibanaChrome or loginErrorMessage
    if (expectedResult === 'spaceSelector') {
      await this.retry.try(() => this.testSubjects.find('kibanaSpaceSelector'));
      this.log.debug(
        `Finished login process, landed on space selector. currentUrl = ${await this.browser.getCurrentUrl()}`
      );
      return;
    }

    if (expectedResult === 'error') {
      const rawDataTabLocator = 'a[id=rawdata-tab]';
      if (await this.find.existsByCssSelector(rawDataTabLocator)) {
        // Firefox has 3 tabs and requires navigation to see Raw output
        await this.find.clickByCssSelector(rawDataTabLocator);
      }
      await this.retry.try(async () => {
        if (await this.find.existsByCssSelector(rawDataTabLocator)) {
          await this.find.clickByCssSelector(rawDataTabLocator);
        }
        await this.testSubjects.existOrFail('ResetSessionButton');
      });
      this.log.debug(
        `Finished login process, found reset session button message. currentUrl = ${await this.browser.getCurrentUrl()}`
      );
      return;
    }

    if (expectedResult === 'chrome') {
      await this.find.byCssSelector('[data-test-subj="userMenuAvatar"]', 20000);
      this.log.debug(`Finished login process currentUrl = ${await this.browser.getCurrentUrl()}`);
    }

    if (expectedResult instanceof Function) {
      await expectedResult();
      this.log.debug(
        `Finished login process, await for custom condition. currentUrl = ${await this.browser.getCurrentUrl()}`
      );
    }
  }

  async initTests() {
    this.log.debug('SecurityPage:initTests');
    await this.esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    await this.esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    await this.browser.setWindowSize(1600, 1000);
  }

  async login(username?: string, password?: string, options: LoginOptions = {}) {
    await this.loginPage.login(username, password, options);

    if (options.expectSpaceSelector || options.expectForbidden) {
      return;
    }

    await this.retry.waitFor(
      'logout button visible',
      async () => await this.userMenu.logoutLinkExists()
    );
  }

  async logout() {
    this.log.debug('SecurityPage.logout');

    if (!(await this.userMenu.logoutLinkExists())) {
      this.log.debug('Logout not found');
      return;
    }

    await this.userMenu.clickLogoutButton();
    await this.waitForLoginPage();
  }

  async getCurrentUser() {
    const sidCookie = await this.browser.getCookie('sid');
    if (!sidCookie?.value) {
      this.log.debug('User is not authenticated yet.');
      return null;
    }

    const { body: user } = await this.supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', `sid=${sidCookie.value}`)
      .expect(200);
    return user as AuthenticatedUser;
  }

  async forceLogout() {
    this.log.debug('SecurityPage.forceLogout');
    if (await this.find.existsByDisplayedByCssSelector('.login-form', 100)) {
      this.log.debug('Already on the login page, not forcing anything');
      return;
    }

    this.log.debug('Redirecting to /logout to force the logout');
    const url = this.deployment.getHostPort() + '/logout';
    await this.browser.get(url);
    this.log.debug('Waiting on the login form to appear');
    await this.waitForLoginPage();
  }

  async clickRolesSection() {
    await this.testSubjects.click('roles');
  }

  async clickUsersSection() {
    await this.testSubjects.click('users');
  }

  async clickCreateNewUser() {
    await this.retry.try(() => this.testSubjects.click('createUserButton'));
  }

  async clickCreateNewRole() {
    await this.retry.try(() => this.testSubjects.click('createRoleButton'));
  }

  async clickCloneRole(roleName: string) {
    await this.retry.try(() => this.testSubjects.click(`clone-role-action-${roleName}`));
  }

  async clickCancelEditUser() {
    await this.find.clickByButtonText('Cancel');
  }

  async clickCancelEditRole() {
    await this.testSubjects.click('roleFormCancelButton');
  }

  async clickSaveEditUser() {
    await this.find.clickByButtonText('Update user');
    await this.header.waitUntilLoadingHasFinished();
  }

  async clickSaveCreateUser() {
    await this.find.clickByButtonText('Create user');
    await this.header.waitUntilLoadingHasFinished();
  }

  async clickSaveEditRole() {
    const saveButton = await this.retry.try(() => this.testSubjects.find('roleFormSaveButton'));
    await saveButton.moveMouseTo();
    await saveButton.click();
    await this.header.waitUntilLoadingHasFinished();
  }

  async addIndexToRole(index: string) {
    this.log.debug(`Adding index ${index} to role`);
    await this.comboBox.setCustom('indicesInput0', index);
  }

  async addPrivilegeToRole(privilege: string) {
    this.log.debug(`Adding privilege ${privilege} to role`);
    const privilegeInput = await this.retry.try(() =>
      this.find.byCssSelector('[data-test-subj="privilegesInput0"] input')
    );
    await privilegeInput.type(privilege);

    const btn = await this.find.byButtonText(privilege);
    await btn.click();

    // const options = await this.find.byCssSelector(`.euiFilterSelectItem`);
    // Object.entries(options).forEach(([key, prop]) => {
    //   console.log({ key, proto: prop.__proto__ });
    // });

    // await options.click();
  }

  async assignRoleToUser(role: string) {
    await this.selectRole(role);
  }

  async navigateTo() {
    await this.common.navigateToApp('settings');
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
    await this.testSubjects.click('tablePaginationPopoverButton');
    await this.testSubjects.click('tablePagination-100-rows');
    for (const user of await this.testSubjects.findAll('userRow')) {
      const fullnameElement = await user.findByTestSubject('userRowFullName');
      const usernameElement = await user.findByTestSubject('userRowUserName');
      const emailElement = await user.findByTestSubject('userRowEmail');
      const rolesElement = await user.findByTestSubject('userRowRoles');
      // findAll is substantially faster than `find.descendantExistsByCssSelector for negative cases
      const isUserReserved = (await user.findAllByTestSubject('userReserved', 1)).length > 0;
      const isUserDeprecated = (await user.findAllByTestSubject('userDeprecated', 1)).length > 0;
      const isEnabled = (await user.findAllByTestSubject('userDisabled', 1)).length === 0;
      users.push({
        username: await usernameElement.getVisibleText(),
        fullname: await fullnameElement.getVisibleText(),
        email: await emailElement.getVisibleText(),
        roles: (await rolesElement.getVisibleText()).split('\n').map((role) => role.trim()),
        reserved: isUserReserved,
        deprecated: isUserDeprecated,
        enabled: isEnabled,
      });
    }

    return users;
  }

  async getElasticsearchRoles() {
    const roles = [];
    await this.testSubjects.click('tablePaginationPopoverButton');
    await this.testSubjects.click('tablePagination-100-rows');
    for (const role of await this.testSubjects.findAll('roleRow')) {
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

  /**
   * @deprecated Use `this.security.clickCreateNewUser` instead
   */
  async clickNewUser() {
    return await this.testSubjects.click('createUserButton');
  }

  /**
   * @deprecated Use `this.security.clickCreateNewUser` instead
   */
  async clickNewRole() {
    return await this.testSubjects.click('createRoleButton');
  }

  async fillUserForm(user: UserFormValues) {
    if (user.username) {
      await this.find.setValue('[name=username]', user.username);
    }
    if (user.password) {
      await this.find.setValue('[name=password]', user.password);
    }
    if (user.confirm_password) {
      await this.find.setValue('[name=confirm_password]', user.confirm_password);
    }
    if (user.full_name) {
      await this.find.setValue('[name=full_name]', user.full_name);
    }
    if (user.email) {
      await this.find.setValue('[name=email]', user.email);
    }

    const rolesToAdd = user.roles || [];
    for (let i = 0; i < rolesToAdd.length; i++) {
      await this.selectRole(rolesToAdd[i]);
    }
  }

  async updateUserProfileForm(user: UserFormValues) {
    if (user.full_name) {
      await this.find.setValue('[name=full_name]', user.full_name);
    }
    if (user.email) {
      await this.find.setValue('[name=email]', user.email);
    }
  }

  async submitCreateUserForm() {
    await this.find.clickByButtonText('Create user');
  }

  async submitUpdateUserForm() {
    await this.find.clickByButtonText('Update user');
  }

  async createUser(user: UserFormValues) {
    await this.clickElasticsearchUsers();
    await this.clickCreateNewUser();
    await this.fillUserForm(user);
    await this.submitCreateUserForm();
  }

  async clickUserByUserName(username: string) {
    await this.find.clickByDisplayedLinkText(username);
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  async updateUserPassword(user: UserFormValues, isCurrentUser: boolean = false) {
    await this.clickUserByUserName(user.username ?? '');
    await this.testSubjects.click('editUserChangePasswordButton');
    if (isCurrentUser) {
      await this.testSubjects.setValue(
        'editUserChangePasswordCurrentPasswordInput',
        user.current_password ?? ''
      );
    }
    await this.testSubjects.setValue('editUserChangePasswordNewPasswordInput', user.password ?? '');
    await this.testSubjects.setValue(
      'editUserChangePasswordConfirmPasswordInput',
      user.confirm_password ?? ''
    );
    await this.testSubjects.click('formFlyoutSubmitButton');
  }

  async updateUserProfile(user: UserFormValues) {
    await this.clickUserByUserName(user.username ?? '');
    await this.updateUserProfileForm(user);
    await this.submitUpdateUserForm();
  }

  async deactivatesUser(user: UserFormValues) {
    await this.clickUserByUserName(user.username ?? '');
    await this.testSubjects.click('editUserDisableUserButton');
    await this.testSubjects.click('confirmModalConfirmButton');
    await this.submitUpdateUserForm();
  }

  async activatesUser(user: UserFormValues) {
    await this.clickUserByUserName(user.username ?? '');
    await this.testSubjects.click('editUserEnableUserButton');
    await this.testSubjects.click('confirmModalConfirmButton');
    await this.submitUpdateUserForm();
  }

  async deleteUser(username: string) {
    this.log.debug('Delete user ' + username);
    await this.clickUserByUserName(username);

    this.log.debug('Find delete button and click');
    await this.find.clickByButtonText('Delete user');
    await this.common.sleep(2000);

    const confirmText = await this.testSubjects.getVisibleText('confirmModalBodyText');
    this.log.debug('Delete user alert text = ' + confirmText);
    await this.testSubjects.click('confirmModalConfirmButton');
    return confirmText;
  }

  async addRole(
    roleName: string,
    roleObj: { elasticsearch: Pick<Role['elasticsearch'], 'indices'> }
  ) {
    const self = this;

    await this.clickCreateNewRole();

    // We have to use non-test-subject selectors because this markup is generated by ui-select.
    this.log.debug('roleObj.indices[0].names = ' + roleObj.elasticsearch.indices[0].names);
    await this.testSubjects.append('roleFormNameInput', roleName);

    for (const indexName of roleObj.elasticsearch.indices[0].names) {
      await this.comboBox.setCustom('indicesInput0', indexName);
    }

    if (roleObj.elasticsearch.indices[0].query) {
      await this.testSubjects.click('restrictDocumentsQuery0');
      await this.monacoEditor.setCodeEditorValue(roleObj.elasticsearch.indices[0].query);
    }

    await this.testSubjects.click('addSpacePrivilegeButton');
    await this.testSubjects.click('spaceSelectorComboBox');

    const globalSpaceOption = await this.find.byCssSelector(`#spaceOption_\\*`);
    await globalSpaceOption.click();

    await this.testSubjects.click('basePrivilege_all');
    await this.testSubjects.click('createSpacePrivilegeButton');

    const addPrivilege = (privileges: string[]) => {
      return privileges.reduce((promise: Promise<any>, privilegeName: string) => {
        return promise
          .then(() => self.addPrivilegeToRole(privilegeName))
          .then(() => this.common.sleep(250));
      }, Promise.resolve());
    };

    await addPrivilege(roleObj.elasticsearch.indices[0].privileges);

    const addGrantedField = async (fields: string[]) => {
      for (const entry of fields) {
        await this.comboBox.setCustom('fieldInput0', entry);
      }
    };

    // clicking the Granted fields and removing the asterix
    if (roleObj.elasticsearch.indices[0].field_security) {
      // Toggle FLS switch
      await this.testSubjects.click('restrictFieldsQuery0');

      // have to remove the '*'
      await this.find.clickByCssSelector(
        'div[data-test-subj="fieldInput0"] [title="Remove * from selection in this group"] svg.euiIcon'
      );

      await addGrantedField(roleObj.elasticsearch.indices[0].field_security!.grant!);
    }

    this.log.debug('click save button');
    await this.testSubjects.click('roleFormSaveButton');

    // Signifies that the role management page redirected back to the role grid page,
    // and successfully refreshed the grid
    await this.testSubjects.existOrFail('roleRow');
  }

  async selectRole(role: string) {
    const dropdown = await this.testSubjects.find('rolesDropdown');
    const input = await dropdown.findByCssSelector('input');
    await input.type(role);
    await this.find.clickByCssSelector(`[role=option][title="${role}"]`);
    await this.testSubjects.click('comboBoxToggleListButton');
  }
}
