/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';
import { navigateToCorrelateReport } from '../../../lib/navigate_to_correlation_reports';
import { HuntFindingsPanel, type HuntFindingListItem } from './hunt_findings_panel';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/navigate_to_correlation_reports', () => ({
  navigateToCorrelateReport: jest.fn(),
}));
jest.mock('../lib/deploy_esql_rule', () => ({
  deployEsqlRule: jest.fn(),
}));

const defaultFinding: HuntFindingListItem = {
  id: 'finding-1',
  '@timestamp': '2026-01-01T12:00:00.000Z',
  report_id: 'report-1',
  report_title: 'Sample report',
  technique_id: 'T1059',
  technique_name: 'Command and Scripting Interpreter',
  hypothesis: 'Suspicious PowerShell activity may indicate post-exploitation.',
  confidence: 0.82,
  severity: 'high',
  risk_score: 73,
  proposed_esql_rule: 'FROM logs | LIMIT 10',
  affected_assets: { hosts: ['host-a'], users: ['alice'] },
};

const defaultProps = {
  findings: [defaultFinding],
  isLoading: false,
  onHighlightReport: jest.fn(),
  http: {} as never,
  notifications: {
    toasts: { addSuccess: jest.fn(), addError: jest.fn(), addDanger: jest.fn() },
  } as never,
  application: { navigateToApp: jest.fn() } as never,
};

const renderPanel = (overrides: Partial<React.ComponentProps<typeof HuntFindingsPanel>> = {}) =>
  render(
    <I18nProvider>
      <HuntFindingsPanel {...defaultProps} {...overrides} />
    </I18nProvider>
  );

describe('HuntFindingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useKibana).mockReturnValue({
      services: { share: { url: { locators: { get: jest.fn() } } } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('calls onCorrelateReport when provided and Correlate is clicked', () => {
    const onCorrelateReport = jest.fn();
    renderPanel({ onCorrelateReport });

    fireEvent.click(screen.getByTestId('threatIntelHuntFindingCorrelate-finding-1'));

    expect(onCorrelateReport).toHaveBeenCalledWith('report-1');
  });

  it('falls back to navigateToCorrelateReport when onCorrelateReport is omitted', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('threatIntelHuntFindingCorrelate-finding-1'));

    expect(navigateToCorrelateReport).toHaveBeenCalledWith(defaultProps.application, 'report-1');
  });

  it('renders source report as plain text without a link', () => {
    renderPanel();

    expect(screen.getByTestId('threatIntelHuntFindingSource-finding-1').closest('a')).toBeNull();
    expect(screen.getByText('Sample report')).toBeInTheDocument();
  });

  it('opens the hunt finding flyout when a row is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('threatIntelHuntFindingRow-finding-1'));

    expect(screen.getByTestId('threatIntelHuntFindingFlyout')).toBeInTheDocument();
  });
});
