/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDEX_PATTERN } from '@kbn/security-solution-plugin/common/constants';

import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';

import { hostsUrl } from '../../../../urls/navigation';
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
} from '../../../../tasks/sourcerer';
import { postDataView } from '../../../../tasks/api_calls/common';
import { SOURCERER } from '../../../../screens/sourcerer';

const siemDataViewTitle = 'Security Default Data View';
const dataViews = ['auditbeat-*,fakebeat-*', 'auditbeat-*,*beat*,siem-read*,.kibana*,fakebeat-*'];

// FLAKY: https://github.com/elastic/kibana/issues/177080
describe.skip('Sourcerer', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    dataViews.forEach((dataView: string) => postDataView(dataView));
  });

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

  // FLAKY: https://github.com/elastic/kibana/issues/177586
  describe.skip('Modified badge', () => {
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
