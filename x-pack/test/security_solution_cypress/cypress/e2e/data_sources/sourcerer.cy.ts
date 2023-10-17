/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDEX_PATTERN } from '@kbn/security-solution-plugin/common/constants';

import { login, loginWithUser } from '../../tasks/login';
import { visitWithTimeRange, visitWithUser } from '../../tasks/navigation';

import { hostsUrl } from '../../urls/navigation';
import {
  addIndexToDefault,
  deselectSourcererOptions,
  isDataViewSelection,
  isHostsStatValue,
  isKibanaDataViewOption,
  isNotSourcererSelection,
  isSourcererOptions,
  isSourcererSelection,
  openAdvancedSettings,
  openDataViewSelection,
  openSourcerer,
  resetSourcerer,
  saveSourcerer,
} from '../../tasks/sourcerer';
import { postDataView } from '../../tasks/common';
import { createUsersAndRoles, secReadCasesAll, secReadCasesAllUser } from '../../tasks/privileges';
import { TOASTER } from '../../screens/configure_cases';
import { SOURCERER } from '../../screens/sourcerer';

const usersToCreate = [secReadCasesAllUser];
const rolesToCreate = [secReadCasesAll];
const siemDataViewTitle = 'Security Default Data View';
const dataViews = ['auditbeat-*,fakebeat-*', 'auditbeat-*,*beat*,siem-read*,.kibana*,fakebeat-*'];

// TODO: https://github.com/elastic/kibana/issues/161539
describe('Sourcerer', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  before(() => {
    cy.task('esArchiverResetKibana');
    dataViews.forEach((dataView: string) => postDataView(dataView));
  });

  // TODO: https://github.com/elastic/kibana/issues/161539
  describe('permissions', { tags: ['@ess', '@brokenInServerless'] }, () => {
    before(() => {
      createUsersAndRoles(usersToCreate, rolesToCreate);
    });
    it(`role(s) ${secReadCasesAllUser.roles.join()} shows error when user does not have permissions`, () => {
      loginWithUser(secReadCasesAllUser);
      visitWithUser(hostsUrl('allHosts'), secReadCasesAllUser);
      cy.get(TOASTER).should('have.text', 'Write role required to generate data');
    });
  });

  // TODO: https://github.com/elastic/kibana/issues/161539
  // FLAKY: https://github.com/elastic/kibana/issues/165766
  describe('Default scope', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      login();
      visitWithTimeRange(hostsUrl('allHosts'));
    });

    it('correctly loads SIEM data view', () => {
      openSourcerer();
      isDataViewSelection(siemDataViewTitle);
      openAdvancedSettings();
      isSourcererSelection(`auditbeat-*`);
      isSourcererOptions(DEFAULT_INDEX_PATTERN.filter((pattern) => pattern !== 'auditbeat-*'));
    });

    describe('Modified badge', () => {
      it('Selecting new data view does not add a modified badge', () => {
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
        openDataViewSelection();
        isKibanaDataViewOption(dataViews);
        cy.get(SOURCERER.selectListDefaultOption).should(`contain`, siemDataViewTitle);
        cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
        isDataViewSelection(dataViews[1]);
        saveSourcerer();
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
      });

      it('shows modified badge when index patterns change and removes when reset', () => {
        openSourcerer();
        openDataViewSelection();
        cy.get(SOURCERER.selectListOption).contains(dataViews[1]).click();
        isDataViewSelection(dataViews[1]);
        openAdvancedSettings();
        const patterns = dataViews[1].split(',');
        deselectSourcererOptions([patterns[0]]);
        saveSourcerer();
        cy.get(SOURCERER.badgeModified).should(`exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`exist`);
        resetSourcerer();
        saveSourcerer();
        cy.get(SOURCERER.badgeModified).should(`not.exist`);
        openSourcerer();
        cy.get(SOURCERER.badgeModifiedOption).should(`not.exist`);
        isDataViewSelection(siemDataViewTitle);
      });
    });

    it('disables save when no patterns are selected', () => {
      openSourcerer();
      openAdvancedSettings();
      cy.get(SOURCERER.saveButton).should('be.enabled');
      deselectSourcererOptions(['auditbeat-*']);
      cy.get(SOURCERER.saveButton).should('be.disabled');
    });

    it(
      'adds a pattern to the default index and correctly filters out auditbeat-*',
      { tags: '@brokenInServerless' },
      () => {
        openSourcerer();
        isSourcererSelection(`auditbeat-*`);
        isNotSourcererSelection('*beat*');
        addIndexToDefault('*beat*');
        isHostsStatValue('1');
        openSourcerer();
        openAdvancedSettings();
        isSourcererSelection(`auditbeat-*`);
        isSourcererSelection('*beat*');
      }
    );
  });
});
