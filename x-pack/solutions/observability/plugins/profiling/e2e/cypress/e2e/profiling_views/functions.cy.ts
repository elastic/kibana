/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';

describe('Functions page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:00:30.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('opens /topN page when navigating to /functions page', () => {
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.url().should('include', '/app/profiling/functions/topn');
  });

  it('shows TopN functions and Differential TopN functions', () => {
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.contains('TopN functions');
    cy.contains('Differential TopN functions');
  });

  it('validates values in the table', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(1).contains('1');
    cy.get(firstRowSelector).eq(2).contains('vmlinux');
    cy.get(firstRowSelector).eq(3).contains('5.46%');
    cy.get(firstRowSelector).eq(4).contains('5.46%');
    cy.get(firstRowSelector).eq(5).contains('4.19 lbs / 1.9 kg');
    cy.get(firstRowSelector).eq(6).contains('$18.29');
    cy.get(firstRowSelector).eq(7).contains('28');
  });

  it('shows function details when action button is clicked on the table ', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector =
      '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"] .euiButtonIcon';
    cy.get(firstRowSelector).click();
    cy.contains('Frame information');
    cy.contains('Impact estimates');
    [
      { parentKey: 'informationRows', key: 'executable', value: 'vmlinux' },
      { parentKey: 'informationRows', key: 'function', value: 'N/A' },
      { parentKey: 'informationRows', key: 'sourceFile', value: 'N/A' },
      { parentKey: 'impactEstimates', key: 'totalCPU', value: '5.46%' },
      { parentKey: 'impactEstimates', key: 'selfCPU', value: '5.46%' },
      { parentKey: 'impactEstimates', key: 'samples', value: '28' },
      { parentKey: 'impactEstimates', key: 'selfSamples', value: '28' },
      { parentKey: 'impactEstimates', key: 'coreSeconds', value: '1.47 seconds' },
      { parentKey: 'impactEstimates', key: 'selfCoreSeconds', value: '1.47 seconds' },
      { parentKey: 'impactEstimates', key: 'annualizedCoreSeconds', value: '17.93 days' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfCoreSeconds', value: '17.93 days' },
      { parentKey: 'impactEstimates', key: 'co2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'annualizedCo2Emission', value: '4.19 lbs / 1.9 kg' },
      {
        parentKey: 'impactEstimates',
        key: 'annualizedSelfCo2Emission',
        value: '4.19 lbs / 1.9 kg',
      },
      { parentKey: 'impactEstimates', key: 'dollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'selfDollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'annualizedDollarCost', value: '$18.29' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfDollarCost', value: '$18.29' },
    ].forEach(({ parentKey, key, value }) => {
      cy.get(`[data-test-subj="${parentKey}_${key}"]`).contains(value);
    });
  });

  it('adds kql filter', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(2).contains('vmlinux');
    cy.addKqlFilter({ key: 'Stacktrace.id', value: '-7DvnP1mizQYw8mIIpgbMg' });
    cy.wait('@getTopNFunctions');
    cy.get(firstRowSelector).eq(2).contains('libjvm.so');
  });

  describe('Test changing CO2 settings', () => {
    function resetSettings() {
      cy.updateAdvancedSettings({
        [profilingCo2PerKWH]: 0.000379069,
        [profilingDatacenterPUE]: 1.7,
        [profilingPervCPUWattX86]: 7,
      });
    }
    beforeEach(resetSettings);
    afterEach(resetSettings);

    it('changes CO2 settings and validate values in the table', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
      cy.wait('@getTopNFunctions');
      const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
      cy.get(firstRowSelector).eq(1).contains('1');
      cy.get(firstRowSelector).eq(2).contains('vmlinux');
      cy.get(firstRowSelector).eq(5).contains('4.19 lbs / 1.9 kg');
      cy.contains('Settings').click();
      cy.contains('Advanced Settings');
      cy.get(`[data-test-subj="management-settings-editField-${profilingCo2PerKWH}"]`)
        .clear()
        .type('0.12345');
      cy.get(`[data-test-subj="management-settings-editField-${profilingDatacenterPUE}"]`)
        .clear()
        .type('2.4');
      cy.get(`[data-test-subj="management-settings-editField-${profilingPervCPUWattX86}"]`)
        .clear()
        .type('20');
      cy.contains('Save changes').click();
      cy.getByTestSubj('kbnLoadingMessage').should('exist');
      cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
        timeout: 50000,
      });
      cy.go('back');
      cy.wait('@getTopNFunctions');
      cy.get(firstRowSelector).eq(5).contains('1.97k lbs / 892.5 kg');
      const firstRowSelectorActionButton =
        '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"] .euiButtonIcon';
      cy.get(firstRowSelectorActionButton).click();
      [
        { parentKey: 'impactEstimates', key: 'co2Emission', value: '~0.00 lbs / ~0.00 kg' },
        { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '~0.00 lbs / ~0.00 kg' },
        {
          parentKey: 'impactEstimates',
          key: 'annualizedCo2Emission',
          value: '1.97k lbs / 892.5 kg',
        },
        {
          parentKey: 'impactEstimates',
          key: 'annualizedSelfCo2Emission',
          value: '1.97k lbs / 892.5 kg',
        },
      ].forEach(({ parentKey, key, value }) => {
        cy.get(`[data-test-subj="${parentKey}_${key}"]`).contains(value);
      });
    });
  });
});
