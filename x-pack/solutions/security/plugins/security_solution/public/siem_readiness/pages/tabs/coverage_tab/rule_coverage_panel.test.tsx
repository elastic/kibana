/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleCoveragePanel } from './rule_coverage_panel';
import { useKibana } from '../../../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../../../common/lib/telemetry/events/siem_readiness/types';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useBasePath: jest.fn(() => '/test/base/path'),
}));
jest.mock('../../../hooks/use_siem_readiness_cases', () => ({
  useSiemReadinessCases: () => ({ openNewCaseFlyout: jest.fn() }),
}));
jest.mock('@kbn/siem-readiness', () => ({
  useSiemReadinessApi: () => ({
    getDetectionRules: { data: { data: [] }, isLoading: false },
  }),
  useDetectionRulesByIntegration: () => ({
    ruleIntegrationCoverage: { coveredRules: [], missingIntegrations: [] },
    enabledPackagesSet: new Set(),
    disabledPackagesSet: new Set(),
  }),
}));
jest.mock('./rule_coverage_panels/all_rules', () => ({
  AllRuleCoveragePanel: () => <div data-testid="all-rules-panel" />,
}));
jest.mock('./rule_coverage_panels/mitre_attack_rules', () => ({
  MitreAttackRuleCoveragePanel: () => <div data-testid="mitre-panel" />,
}));
jest.mock('../../components/view_cases_button', () => ({
  ViewCasesButton: () => null,
}));

const mockReportEvent = jest.fn();

describe('RuleCoveragePanel telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { telemetry: { reportEvent: mockReportEvent } },
    });
  });

  it('reports RuleViewToggled with view: mitre_attack when MITRE toggle is clicked', () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <RuleCoveragePanel />
      </IntlProvider>
    );
    fireEvent.click(getByText('MITRE ATT&CK enabled rules'));
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.RuleViewToggled, {
      view: 'mitre_attack',
    });
  });

  it('reports RuleViewToggled with view: all_rules when All rules toggle is clicked', () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <RuleCoveragePanel />
      </IntlProvider>
    );
    fireEvent.click(getByText('MITRE ATT&CK enabled rules'));
    mockReportEvent.mockClear();
    fireEvent.click(getByText('All enabled rules'));
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.RuleViewToggled, {
      view: 'all_rules',
    });
  });
});
