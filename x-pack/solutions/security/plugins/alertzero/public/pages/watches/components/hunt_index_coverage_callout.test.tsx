/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import { HuntIndexCoverageCallout } from './hunt_index_coverage_callout';

const coverage = (
  overrides: Partial<HuntWorkerIndexCoverageResponse> = {}
): HuntWorkerIndexCoverageResponse => ({
  universe: ['logs-*', 'custom-edr-*'],
  unreadable_by_worker: ['custom-edr-*'],
  missing_for_everyone: [],
  source: 'last_sweep',
  checked_at: '2026-10-28T10:00:00.000Z',
  service_account_id: 'kibana/alertzero_threat_hunt',
  role_name: 'alertzero_threat_hunt',
  account_label: 'kibana/alertzero_threat_hunt',
  is_serverless: false,
  ...overrides,
});

const renderCallout = (value: HuntWorkerIndexCoverageResponse | undefined) =>
  render(
    <I18nProvider>
      <HuntIndexCoverageCallout coverage={value} />
    </I18nProvider>
  );

describe('HuntIndexCoverageCallout', () => {
  it('lists the unreadable patterns for a last sweep', () => {
    renderCallout(coverage());
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).toHaveTextContent(
      'custom-edr-*'
    );
  });

  it('lists the unreadable patterns for the role source', () => {
    renderCallout(coverage({ source: 'role' }));
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).toHaveTextContent(
      'custom-edr-*'
    );
  });

  it('names the account by its label', () => {
    renderCallout(
      coverage({ service_account_id: 'opaque-uiam-id', account_label: 'alertzero_threat_hunt' })
    );
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).toHaveTextContent(
      'Patterns alertzero_threat_hunt cannot read:'
    );
  });

  it('does not show the raw service account id', () => {
    renderCallout(
      coverage({ service_account_id: 'opaque-uiam-id', account_label: 'alertzero_threat_hunt' })
    );
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).not.toHaveTextContent(
      'opaque-uiam-id'
    );
  });

  it('says it is based on the role for the role source', () => {
    renderCallout(coverage({ source: 'role' }));
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).toHaveTextContent(
      'Based on the alertzero_threat_hunt role'
    );
  });

  it('shows the stateful guidance when not serverless', () => {
    renderCallout(coverage({ is_serverless: false }));
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).toHaveTextContent(
      'Cross-cluster patterns need an Elasticsearch version'
    );
  });

  it('shows the serverless guidance when serverless', () => {
    renderCallout(coverage({ is_serverless: true }));
    expect(screen.getByTestId('alertZeroHuntIndexCoverageCallout')).toHaveTextContent(
      'in linked Security projects'
    );
  });

  it('is hidden for an unavailable source', () => {
    renderCallout(coverage({ source: 'unavailable', unavailable_reason: 'role_unreadable' }));
    expect(screen.queryByTestId('alertZeroHuntIndexCoverageCallout')).not.toBeInTheDocument();
  });

  it('is hidden when nothing is unreadable', () => {
    renderCallout(coverage({ unreadable_by_worker: [] }));
    expect(screen.queryByTestId('alertZeroHuntIndexCoverageCallout')).not.toBeInTheDocument();
  });

  it('is hidden while there is no data', () => {
    renderCallout(undefined);
    expect(screen.queryByTestId('alertZeroHuntIndexCoverageCallout')).not.toBeInTheDocument();
  });
});
