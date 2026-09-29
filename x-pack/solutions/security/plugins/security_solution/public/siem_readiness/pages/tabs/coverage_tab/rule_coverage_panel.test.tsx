/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleCoveragePanel } from './rule_coverage_panel';
import { useKibana } from '../../../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../../../common/lib/telemetry/events/siem_readiness/types';

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
      useBasePath: vi.fn(() => '/test/base/path'),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../hooks/use_siem_readiness_cases', () => {
      const mocked = {
      useSiemReadinessCases: () => ({ openNewCaseFlyout: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../hooks/use_siem_readiness_api', () => {
      const mocked = {
      useSiemReadinessApi: () => ({
        getDetectionRules: { data: { data: [] }, isLoading: false },
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../hooks/use_get_detection_rules_by_integration', () => {
      const mocked = {
      useDetectionRulesByIntegration: () => ({
        ruleIntegrationCoverage: { coveredRules: [], missingIntegrations: [] },
        enabledPackagesSet: new Set(),
        disabledPackagesSet: new Set(),
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./rule_coverage_panels/all_rules', () => {
      const mocked = {
      AllRuleCoveragePanel: () => <div data-testid="all-rules-panel" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./rule_coverage_panels/mitre_attack_rules', () => {
      const mocked = {
      MitreAttackRuleCoveragePanel: () => <div data-testid="mitre-panel" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/view_cases_button', () => {
      const mocked = {
      ViewCasesButton: () => null,
    };
      return { ...mocked, default: mocked };
    });

const mockReportEvent = vi.fn();

describe('RuleCoveragePanel telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
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
