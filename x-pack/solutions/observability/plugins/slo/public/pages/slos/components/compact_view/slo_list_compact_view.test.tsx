/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { buildHealthySummary } from '../../../../data/slo/common';
import { buildSlo } from '../../../../data/slo/slo';
import { ActiveAlerts } from '../../../../hooks/active_alerts';
import { useActionModal } from '../../../../context/action_modal';
import { useFetchActiveAlerts } from '../../../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../../hooks/use_fetch_rules_for_slo';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePermissions } from '../../../../hooks/use_permissions';
import { useSpace } from '../../../../hooks/use_space';
import { render } from '../../../../utils/test_helper';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { SloListCompactView } from './slo_list_compact_view';

jest.mock('@kbn/response-ops-rule-form/flyout', () => ({
  RuleFormFlyout: jest.fn(() => <div data-test-subj="add-rule-flyout">Add rule flyout</div>),
}));

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_permissions');
jest.mock('../../../../hooks/use_fetch_active_alerts');
jest.mock('../../../../hooks/use_fetch_rules_for_slo');
jest.mock('../../../../hooks/use_fetch_historical_summary');
jest.mock('../../../../hooks/use_get_filtered_rule_types');
jest.mock('../../../../context/action_modal');
jest.mock('../../hooks/use_url_search_state');
jest.mock('../../../../hooks/use_space');
jest.mock('../slo_sparkline', () => ({
  SloSparkline: () => <div data-test-subj="sloSparkline" />,
}));

const useKibanaMock = useKibana as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as jest.Mock;
const useFetchRulesForSloMock = useFetchRulesForSlo as jest.Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as jest.Mock;
const useGetFilteredRuleTypesMock = useGetFilteredRuleTypes as jest.Mock;
const useActionModalMock = useActionModal as jest.Mock;
const useUrlSearchStateMock = useUrlSearchState as jest.Mock;
const useSpaceMock = useSpace as jest.Mock;

describe('SloListCompactView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        application: { navigateToUrl: jest.fn() },
        http: {
          basePath: {
            prepend: (url: string) => url,
          },
        },
        uiSettings: {
          get: (key: string) => (key === 'format:percent:defaultPattern' ? '0.0%' : ''),
        },
        share: {
          url: {
            locators: {
              get: jest.fn(),
            },
          },
        },
        triggersActionsUi: {
          ruleTypeRegistry: {},
          actionTypeRegistry: {},
        },
      },
    });

    usePermissionsMock.mockReturnValue({ data: { hasAllWriteRequested: true } });
    useFetchActiveAlertsMock.mockReturnValue({ data: new ActiveAlerts() });
    useFetchRulesForSloMock.mockReturnValue({ data: {} });
    useFetchHistoricalSummaryMock.mockReturnValue({ isLoading: false, data: [] });
    useGetFilteredRuleTypesMock.mockReturnValue([]);
    useActionModalMock.mockReturnValue({ triggerAction: jest.fn() });
    useUrlSearchStateMock.mockReturnValue({ onStateChange: jest.fn() });
    useSpaceMock.mockReturnValue('default');
  });

  describe('burn rate column', () => {
    it('shows "Burn rate (5m)" in the column header by default', () => {
      const slo = buildSlo({
        summary: buildHealthySummary({
          fiveMinuteBurnRate: 1.2,
          oneHourBurnRate: 0.8,
          oneDayBurnRate: 0.6,
        }),
      });

      render(<SloListCompactView sloList={[slo]} loading={false} error={false} />);

      expect(screen.getByText('Burn rate (5m)')).toBeInTheDocument();
    });

    it('displays the 5m burn rate value by default', () => {
      const slo = buildSlo({
        summary: buildHealthySummary({
          fiveMinuteBurnRate: 1.2,
          oneHourBurnRate: 0.8,
          oneDayBurnRate: 0.6,
        }),
      });

      render(<SloListCompactView sloList={[slo]} loading={false} error={false} />);

      expect(screen.getByText('1.2x')).toBeInTheDocument();
    });

    it('switches to 1h burn rate when selected from the popover', async () => {
      const slo = buildSlo({
        summary: buildHealthySummary({
          fiveMinuteBurnRate: 1.2,
          oneHourBurnRate: 0.8,
          oneDayBurnRate: 0.6,
        }),
      });

      render(<SloListCompactView sloList={[slo]} loading={false} error={false} />);

      fireEvent.click(screen.getByText('Burn rate (5m)'));
      await waitForEuiPopoverOpen();
      fireEvent.click(screen.getByText('1h'));

      expect(screen.getByText('Burn rate (1h)')).toBeInTheDocument();
      expect(screen.getByText('0.8x')).toBeInTheDocument();
    });

    it('switches to 1d burn rate when selected from the popover', async () => {
      const slo = buildSlo({
        summary: buildHealthySummary({
          fiveMinuteBurnRate: 1.2,
          oneHourBurnRate: 0.8,
          oneDayBurnRate: 0.6,
        }),
      });

      render(<SloListCompactView sloList={[slo]} loading={false} error={false} />);

      fireEvent.click(screen.getByText('Burn rate (5m)'));
      await waitForEuiPopoverOpen();
      fireEvent.click(screen.getByText('1d'));

      expect(screen.getByText('Burn rate (1d)')).toBeInTheDocument();
      expect(screen.getByText('0.6x')).toBeInTheDocument();
    });

    it('shows N/A for burn rate when status is NO_DATA', () => {
      const slo = buildSlo({
        summary: {
          status: 'NO_DATA',
          sliValue: -1,
          errorBudget: { initial: 0.02, consumed: 0, remaining: 1, isEstimated: false },
          fiveMinuteBurnRate: 0,
          oneHourBurnRate: 0,
          oneDayBurnRate: 0,
        },
      });

      render(<SloListCompactView sloList={[slo]} loading={false} error={false} />);

      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });
});
