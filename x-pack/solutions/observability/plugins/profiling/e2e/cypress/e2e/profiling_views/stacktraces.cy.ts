/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Stacktraces page', () => {
  const rangeFrom = '2023-04-18T00:00:00.000Z';
  const rangeTo = '2023-04-18T00:05:00.000Z';

  beforeEach(() => {
    cy.loginAsElastic();
  });

  it('Persists kql filter when navigating between tabs', () => {
    cy.intercept('GET', '/internal/profiling/topn/threads?*').as('getThreads');
    cy.visitKibana('/app/profiling/stacktraces/threads', { rangeFrom, rangeTo });
    cy.wait('@getThreads');
    cy.addKqlFilter({
      key: 'Stacktrace.id',
      value: '-7DvnP1mizQYw8mIIpgbMg',
    });
    const kueryInUrl = 'kuery=Stacktrace.id%20%3A%20%22-7DvnP1mizQYw8mIIpgbMg%22';
    cy.url().should('include', kueryInUrl);
    cy.get('[data-test-subj="profilingPageTemplate"]').contains('Traces').click();
    cy.url().should('include', kueryInUrl);
    cy.get('[data-test-subj="profilingPageTemplate"]').contains('Hosts').click();
    cy.url().should('include', kueryInUrl);
    cy.get('[data-test-subj="profilingPageTemplate"]').contains('Deployments').click();
    cy.url().should('include', kueryInUrl);
    cy.get('[data-test-subj="profilingPageTemplate"]').contains('Containers').click();
    cy.url().should('include', kueryInUrl);
  });

  describe('Threads', () => {
    it('Navigates to the Traces tab when clicking on an item', () => {
      cy.intercept('GET', '/internal/profiling/topn/threads?*').as('getThreads');
      cy.intercept('GET', '/internal/profiling/topn/traces?*').as('getTraces');
      cy.visitKibana('/app/profiling/stacktraces/threads', { rangeFrom, rangeTo });
      cy.wait('@getThreads');
      cy.contains('66687612094024').click();
      cy.wait('@getTraces');
      cy.url().should(
        'include',
        '/stacktraces/traces?displayAs=stackTraces&kuery=process.thread.name%3A%2266687612094024%22'
      );
    });

    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/threads?*').as('getThreads');
      cy.visitKibana('/app/profiling/stacktraces/threads', { rangeFrom, rangeTo });
      cy.wait('@getThreads');
      cy.contains('Top 46');
      cy.addKqlFilter({ key: 'process.thread.name', value: '66687612094024' });
      cy.contains('Top 1');
    });
  });

  describe('Traces', () => {
    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/traces?*').as('getTraces');
      cy.visitKibana('/app/profiling/stacktraces/traces', { rangeFrom, rangeTo });
      cy.wait('@getTraces');
      cy.contains('Top 100');
      cy.addKqlFilter({ key: 'Stacktrace.id', value: '-7DvnP1mizQYw8mIIpgbMg' });
      cy.contains('Top 1');
    });

    it('opens flyout when clicking on an item', () => {
      cy.intercept('GET', '/internal/profiling/topn/traces?*').as('getTraces');
      cy.visitKibana('/app/profiling/stacktraces/traces', { rangeFrom, rangeTo });
      cy.wait('@getTraces');
      cy.contains('Top 100');
      cy.get('.euiFlyout').should('not.exist');
      cy.contains('oVuo4Odmf-MdkPEKxNJxdQ').click();
      cy.get('.euiFlyout').should('exist');
    });
  });

  describe('Hosts', () => {
    it('Navigates to the Traces tab when clicking on an item', () => {
      cy.intercept('GET', '/internal/profiling/topn/hosts?*').as('getHosts');
      cy.intercept('GET', '/internal/profiling/topn/traces?*').as('getTraces');
      cy.visitKibana('/app/profiling/stacktraces/hosts', { rangeFrom, rangeTo });
      cy.wait('@getHosts');
      cy.contains('ip-192-168-1-2').click();
      cy.wait('@getTraces');
      cy.url().should(
        'include',
        '/stacktraces/traces?displayAs=stackTraces&kuery=host.id%3A%228457605156473051743%22'
      );
    });

    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/hosts?*').as('getHosts');
      cy.visitKibana('/app/profiling/stacktraces/hosts', { rangeFrom, rangeTo });
      cy.wait('@getHosts');
      cy.contains('Top 1');
      cy.addKqlFilter({ key: 'process.thread.name', value: 'foo', waitForSuggestion: false });
      cy.contains('Top 0');
    });
  });

  describe('Deployments', () => {
    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/deployments?*').as('getDeployments');
      cy.visitKibana('/app/profiling/stacktraces/deployments', { rangeFrom, rangeTo });
      cy.wait('@getDeployments');
      cy.contains('Top 1');
      cy.addKqlFilter({ key: 'process.thread.name', value: 'foo', waitForSuggestion: false });
      cy.contains('Top 0');
    });
  });

  describe('Containers', () => {
    it('Navigates to the Traces tab when clicking on an item', () => {
      cy.intercept('GET', '/internal/profiling/topn/containers?*').as('getContainer');
      cy.intercept('GET', '/internal/profiling/topn/traces?*').as('getTraces');
      cy.visitKibana('/app/profiling/stacktraces/containers', { rangeFrom, rangeTo });
      cy.wait('@getContainer');
      cy.contains('instance-0000000010').click();
      cy.wait('@getTraces');
      cy.url().should(
        'include',
        '/stacktraces/traces?displayAs=stackTraces&kuery=container.name%3A%22instance-0000000010%22'
      );
    });

    it('adds kql filter', () => {
      cy.intercept('GET', '/internal/profiling/topn/containers?*').as('getContainer');
      cy.visitKibana('/app/profiling/stacktraces/containers', { rangeFrom, rangeTo });
      cy.wait('@getContainer');
      cy.contains('Top 1');
      cy.addKqlFilter({ key: 'process.thread.name', value: 'foo', waitForSuggestion: false });
      cy.contains('Top 0');
    });
  });
});
