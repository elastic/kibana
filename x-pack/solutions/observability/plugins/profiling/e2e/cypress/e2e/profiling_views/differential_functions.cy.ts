/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Differential Functions page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:00:30.000Z';

  const comparisonRangeFrom = '2023-04-18T00:01:00.000Z';
  const comparisonRangeTo = '2023-04-18T00:01:30.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('opens differential page', () => {
    cy.visitKibana('/app/profiling/functions/differential', { rangeFrom, rangeTo });
    cy.contains('Baseline functions');
    cy.contains('Comparison functions');
  });

  describe('summary', () => {
    it('shows only the baseline values when comparison data is not available', () => {
      cy.intercept('GET', `/internal/profiling/topn/functions?*`, (req) => {
        const { timeFrom } = req.query;

        if (Number(timeFrom) === new Date(rangeFrom).getTime()) {
          req.reply({ fixture: 'topn_functions.json' });
        } else {
          req.reply({ fixture: 'topn_functions_empty_data.json' });
        }
      }).as('getTopNFunctions');

      cy.visitKibana('/app/profiling/functions/differential', { rangeFrom, rangeTo });
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '76.06 lbs / 34.5 kg' },
        { id: 'annualizedCost', value: '$325.27' },
        { id: 'totalNumberOfSamples', value: '498' },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        cy.get(`[data-test-subj="${item.id}_comparison_value"]`).should('not.exist');
      });
    });

    it('shows empty baseline values when data is not available', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*', (req) => {
        const { timeFrom } = req.query;

        if (Number(timeFrom) === new Date(rangeFrom).getTime()) {
          req.reply({ fixture: 'topn_functions.json' });
        } else {
          req.reply({ fixture: 'topn_functions_empty_data.json' });
        }
      }).as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        comparisonRangeFrom: rangeFrom,
        comparisonRangeTo: rangeTo,
      });
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '0 lbs / 0 kg', comparisonValue: '76.06 lbs / 34.5 kg' },
        { id: 'annualizedCost', value: '$0', comparisonValue: '$325.27' },
        { id: 'totalNumberOfSamples', value: '0', comparisonValue: '14,940' },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        if (item.comparisonValue) {
          cy.get(`[data-test-subj="${item.id}_comparison_value"]`).contains(item.comparisonValue);
        }
      });
    });

    it('show gained performance when comparison data has less samples than baseline', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*', (req) => {
        const { timeFrom } = req.query;

        if (Number(timeFrom) === new Date(rangeFrom).getTime()) {
          req.reply({ fixture: 'topn_functions.json' });
        } else {
          req.reply({ fixture: 'topn_functions_less_samples_than_baseline.json' });
        }
      }).as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        rangeFrom,
        rangeTo,
        comparisonRangeFrom,
        comparisonRangeTo,
      });
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '66.06%' },
        {
          id: 'annualizedCo2',
          value: '76.06 lbs / 34.5 kg',
          comparisonValue: '25.79 lbs / 11.7 kg (66.09%)',
        },
        {
          id: 'annualizedCost',
          value: '$325.27',
          comparisonValue: '$110.38 (66.06%)',
        },
        {
          id: 'totalNumberOfSamples',
          value: '498',
          comparisonValue: '169 (66.06%)',
        },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        if (item.comparisonValue) {
          cy.get(`[data-test-subj="${item.id}_comparison_value"]`).contains(item.comparisonValue);
        }
      });
    });

    it('show lost performance when comparison data has more samples than baseline', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*', (req) => {
        const { timeFrom } = req.query;
        if (Number(timeFrom) === new Date(comparisonRangeFrom).getTime()) {
          req.reply({ fixture: 'topn_functions_less_samples_than_baseline.json' });
        } else {
          req.reply({ fixture: 'topn_functions.json' });
        }
      }).as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        rangeFrom: comparisonRangeFrom,
        rangeTo: comparisonRangeTo,
        comparisonRangeFrom: rangeFrom,
        comparisonRangeTo: rangeTo,
      });
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '194.67%' },
        {
          id: 'annualizedCo2',
          value: '25.79 lbs / 11.7 kg',
          comparisonValue: '76.06 lbs / 34.5 kg (194.87%)',
        },
        {
          id: 'annualizedCost',
          value: '$110.38',
          comparisonValue: '$325.27 (194.67%)',
        },
        {
          id: 'totalNumberOfSamples',
          value: '169',
          comparisonValue: '498 (194.67%)',
        },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        if (item.comparisonValue) {
          cy.get(`[data-test-subj="${item.id}_comparison_value"]`).contains(item.comparisonValue);
        }
      });
    });
    it('show empty summary when no data is availble', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*', {
        fixture: 'topn_functions_empty_data.json',
      }).as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential');
      // wait for both apis to finisto move on
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      [
        { id: 'overallPerformance', value: '0%' },
        { id: 'annualizedCo2', value: '0 lbs / 0 kg' },
        { id: 'annualizedCost', value: '$0' },
        { id: 'totalNumberOfSamples', value: '0' },
      ].forEach((item) => {
        cy.get(`[data-test-subj="${item.id}_value"]`).contains(item.value);
        cy.get(`[data-test-subj="${item.id}_comparison_value"]`).should('not.exist');
      });
    });

    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/functions?*', (req) => {
        if (req.url.includes('kuery=Stacktrace.id')) {
          req.reply({ fixture: 'topn_functions_stacktrace_filtered.json' });
        } else if (req.url.includes('kuery=process.thread.name')) {
          req.reply({ fixture: 'topn_functions_process_thread_name_filtered.json' });
        } else {
          req.reply({ fixture: 'topn_functions.json' });
        }
      }).as('getTopNFunctions');
      cy.visitKibana('/app/profiling/functions/differential', {
        rangeFrom: comparisonRangeFrom,
        rangeTo: comparisonRangeTo,
        comparisonRangeFrom: rangeFrom,
        comparisonRangeTo: rangeTo,
      });
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      cy.get('[data-test-subj="frame"]').contains('vmlinux');
      cy.get('[data-test-subj="comparison_frame"]').contains('vmlinux');

      cy.addKqlFilter({
        key: 'process.thread.name',
        value: '108795321966692',
      });
      cy.addKqlFilter({
        key: 'Stacktrace.id',
        value: '-7DvnP1mizQYw8mIIpgbMg',
        dataTestSubj: 'profilingComparisonUnifiedSearchBar',
      });
      cy.wait('@getTopNFunctions');
      cy.wait('@getTopNFunctions');
      cy.get('[data-test-subj="frame"]').contains('libsystemd-shared-237.so');
      cy.get('[data-test-subj="comparison_frame"]').contains('libjvm.so');
    });
  });
});
