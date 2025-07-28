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
    cy.intercept('GET', '/internal/profiling/topn/functions?*', {
      fixture: 'topn_functions.json',
    }).as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(1).contains('1');
    cy.get(firstRowSelector).eq(2).contains('vmlinux');
    cy.get(firstRowSelector).eq(3).contains('13.45%');
    cy.get(firstRowSelector).eq(4).contains('13.86%');
    cy.get(firstRowSelector).eq(5).contains('10.58 lbs / 4.8 kg');
    cy.get(firstRowSelector).eq(6).contains('$45.07');
    cy.get(firstRowSelector).eq(7).contains('67');
  });

  it('shows function details when action button is clicked on the table ', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*', {
      fixture: 'topn_functions.json',
    }).as('getTopNFunctions');
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
      { parentKey: 'impactEstimates', key: 'totalCPU', value: '13.86%' },
      { parentKey: 'impactEstimates', key: 'selfCPU', value: '13.45%' },
      { parentKey: 'impactEstimates', key: 'samples', value: '69' },
      { parentKey: 'impactEstimates', key: 'selfSamples', value: '67' },
      { parentKey: 'impactEstimates', key: 'coreSeconds', value: '3.45 seconds' },
      { parentKey: 'impactEstimates', key: 'selfCoreSeconds', value: '3.35 seconds' },
      { parentKey: 'impactEstimates', key: 'annualizedCoreSeconds', value: '1.38 months' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfCoreSeconds', value: '1.34 months' },
      { parentKey: 'impactEstimates', key: 'co2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '~0.00 lbs / ~0.00 kg' },
      { parentKey: 'impactEstimates', key: 'annualizedCo2Emission', value: '10.58 lbs / 4.8 kg' },
      {
        parentKey: 'impactEstimates',
        key: 'annualizedSelfCo2Emission',
        value: '10.14 lbs / 4.6 kg',
      },
      { parentKey: 'impactEstimates', key: 'dollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'selfDollarCost', value: '$~0.00' },
      { parentKey: 'impactEstimates', key: 'annualizedDollarCost', value: '$45.07' },
      { parentKey: 'impactEstimates', key: 'annualizedSelfDollarCost', value: '$43.76' },
    ].forEach(({ parentKey, key, value }) => {
      cy.get(`[data-test-subj="${parentKey}_${key}"]`).contains(value);
    });
  });

  it('adds kql filter', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*', (req) => {
      if (req.url.includes('kuery=Stacktrace.id')) {
        req.reply({ fixture: 'topn_functions_stacktrace_filtered.json' });
      } else {
        req.reply({ fixture: 'topn_functions.json' });
      }
    }).as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(2).contains('vmlinux');
    cy.addKqlFilter({ key: 'Stacktrace.id', value: '-7DvnP1mizQYw8mIIpgbMg' });
    cy.wait('@getTopNFunctions');
    cy.get(firstRowSelector).eq(2).contains('libjvm.so');
  });

  it('Sorting grid', () => {
    cy.intercept('GET', '/internal/profiling/topn/functions?*').as('getTopNFunctions');
    cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
    cy.wait('@getTopNFunctions');
    [
      {
        columnKey: 'rank',
        columnIndex: 1,
        highRank: 4481,
        lowRank: 1,
        highValue: 4481,
        lowValue: 1,
      },
      {
        columnKey: 'samples',
        columnIndex: 7,
        highRank: 1,
        lowRank: 389,
        highValue: 28,
        lowValue: 0,
      },
      {
        columnKey: 'selfCPU',
        columnIndex: 3,
        highRank: 1,
        lowRank: 389,
        highValue: '5.46%',
        lowValue: '0.00%',
      },
      {
        columnKey: 'totalCPU',
        columnIndex: 4,
        highRank: 693,
        lowRank: 44,
        highValue: '60.43%',
        lowValue: '0.19%',
      },
      {
        columnKey: 'annualizedCo2',
        columnIndex: 5,
        highRank: 693,
        lowRank: 44,
        highValue: '44.97 lbs / 20.4 kg',
        lowValue: '0 lbs / 0 kg',
      },
      {
        columnKey: 'annualizedDollarCost',
        columnIndex: 6,
        highRank: 693,
        lowRank: 44,
        highValue: '$192.36',
        lowValue: '$0.62',
      },
    ].forEach(({ columnKey, columnIndex, highRank, highValue, lowRank, lowValue }) => {
      cy.get('[title="Sort High-Low"]').should('not.exist');
      cy.get(`[data-test-subj="dataGridHeaderCell-${columnKey}"]`)
        .focus()
        .trigger('keydown', { key: 'Enter' });
      cy.get('[title="Sort High-Low"]').click();

      const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
      cy.get(firstRowSelector).eq(1).contains(highRank);
      cy.get(firstRowSelector).eq(columnIndex).contains(highValue);

      cy.get(`[data-test-subj="dataGridHeaderCell-${columnKey}"]`)
        .focus()
        .trigger('keydown', { key: 'Enter' });
      cy.get('[title="Sort Low-High"]').click();
      cy.get(firstRowSelector).eq(1).contains(lowRank);
      if (lowValue !== undefined) {
        cy.get(firstRowSelector).eq(columnIndex).contains(lowValue);
      } else {
        cy.get(firstRowSelector).eq(columnIndex).should('not.have.value');
      }
    });

    cy.get(`[data-test-subj="dataGridHeaderCell-frame"]`)
      .focus()
      .trigger('keydown', { key: 'Enter' });
    cy.get('[title="Sort Z-A"]').click();
    const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
    cy.get(firstRowSelector).eq(1).contains('1');
    cy.get(firstRowSelector).eq(2).contains('vmlinux');

    cy.get('[data-test-subj="dataGridHeaderCell-frame"]')
      .focus()
      .trigger('keydown', { key: 'Enter' });
    cy.get('[title="Sort A-Z"]').click();
    cy.get(firstRowSelector).eq(1).contains('88');
    cy.get(firstRowSelector).eq(2).contains('/');
  });

  describe('Test changing CO2 settings', () => {
    after(() => {
      cy.updateAdvancedSettings({
        [profilingCo2PerKWH]: 0.000379069,
        [profilingDatacenterPUE]: 1.7,
        [profilingPervCPUWattX86]: 7,
      });
    });
    it('changes CO2 settings and validate values in the table', () => {
      let callCount = 0;
      cy.intercept('GET', '/internal/profiling/topn/functions?*', (req) => {
        callCount += 1;

        if (callCount === 2) {
          req.reply({ fixture: 'topn_functions_changed_settings.json' });
        } else {
          req.reply({ fixture: 'topn_functions.json' });
        }
      }).as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions', { rangeFrom, rangeTo });
      cy.wait('@getTopNFunctions');
      const firstRowSelector = '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"]';
      cy.get(firstRowSelector).eq(1).contains('1');
      cy.get(firstRowSelector).eq(2).contains('vmlinux');
      cy.get(firstRowSelector).eq(5).contains('10.58 lbs / 4.8 kg');
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
      cy.get(firstRowSelector).eq(5).contains('4.85 lbs / 2.2 kg');
      const firstRowSelectorActionButton =
        '[data-grid-row-index="0"] [data-test-subj="dataGridRowCell"] .euiButtonIcon';
      cy.get(firstRowSelectorActionButton).click();
      [
        { parentKey: 'impactEstimates', key: 'co2Emission', value: '~0.00 lbs / ~0.00 kg' },
        { parentKey: 'impactEstimates', key: 'selfCo2Emission', value: '~0.00 lbs / ~0.00 kg' },
        {
          parentKey: 'impactEstimates',
          key: 'annualizedCo2Emission',
          value: '4.85 lbs / 2.2 kg',
        },
        {
          parentKey: 'impactEstimates',
          key: 'annualizedSelfCo2Emission',
          value: '5.73 lbs / 2.6 kg',
        },
      ].forEach(({ parentKey, key, value }) => {
        cy.get(`[data-test-subj="${parentKey}_${key}"]`).contains(value);
      });
    });
  });
});
