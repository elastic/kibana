/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { Capabilities } from '@kbn/core/public';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { encode } from '@kbn/rison';
import { ALL_VALUE } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Router from 'react-router-dom';
import {
  HEALTHY_STEP_DOWN_ROLLING_SLO,
  historicalSummaryData,
} from '../../data/slo/historical_summary_data';
import { buildApmAvailabilityIndicator } from '../../data/slo/indicator';
import { buildSlo } from '../../data/slo/slo';
import { ActiveAlerts } from '../../hooks/active_alerts';
import { useCreateDataView } from '../../hooks/use_create_data_view';
import { useDeleteSlo } from '../../hooks/use_delete_slo';
import { useDeleteSloInstance } from '../../hooks/use_delete_slo_instance';
import { useFetchActiveAlerts } from '../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../hooks/use_fetch_historical_summary';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { render } from '../../utils/test_helper';
import { transformSloToCloneState } from '../slo_edit/helpers/transform_slo_to_clone_state';
import { SloDetailsPage } from './slo_details';

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-shared-plugin/public');
vi.mock('../../hooks/use_kibana');
vi.mock('../../hooks/use_license');
vi.mock('../../hooks/use_permissions');
vi.mock('../../hooks/use_fetch_active_alerts');
vi.mock('../../hooks/use_fetch_slo_details');
vi.mock('../../hooks/use_fetch_historical_summary');
vi.mock('../../hooks/use_delete_slo');
vi.mock('../../hooks/use_create_data_view');
vi.mock('../../hooks/use_delete_slo_instance');
vi.mock('@kbn/ebt-tools');

const useKibanaMock = useKibana as Mock;
const useLicenseMock = useLicense as Mock;
const usePermissionsMock = usePermissions as Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as Mock;
const useFetchSloDetailsMock = useFetchSloDetails as Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as Mock;
const useDeleteSloMock = useDeleteSlo as Mock;
const useCreateDataViewsMock = useCreateDataView as Mock;
const useDeleteSloInstanceMock = useDeleteSloInstance as Mock;
const TagsListMock = TagsList as Mock;
const usePerformanceContextMock = usePerformanceContext as Mock;

usePerformanceContextMock.mockReturnValue({ onPageReady: vi.fn() });
TagsListMock.mockReturnValue(<div>Tags list</div>);

const mockNavigate = vi.fn();
const mockLocator = vi.fn();
const mockGetMonitor = vi.fn();
const mockDelete = vi.fn();
const mockDeleteInstance = vi.fn();
const mockCapabilities = {
  apm: { show: true },
} as unknown as Capabilities;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      theme: {},
      lens: {
        EmbeddableComponent: () => <div data-test-subj="errorRateChart">mocked component</div>,
      },
      application: { navigateToUrl: mockNavigate, capabilities: mockCapabilities },
      charts: chartPluginMock.createStartContract(),
      http: {
        get: mockGetMonitor,
        basePath: {
          prepend: (url: string) => url,
          get: () => 'http://localhost:5601',
        },
      },
      docLinks: {
        links: {
          query: {},
          observability: {
            slo: 'dummy_link',
          },
        },
      },
      dataViews: {
        create: vi.fn().mockResolvedValue({
          getIndexPattern: vi.fn().mockReturnValue('some-index'),
        }),
      },
      notifications: {
        toasts: {
          addSuccess: vi.fn(),
          addDanger: vi.fn(),
          addError: vi.fn(),
        },
      },
      observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
      inspector: { open: vi.fn() },
      share: {
        url: {
          locators: {
            get: mockLocator,
          },
        },
      },
      triggersActionsUi: {
        ruleTypeRegistry: {},
        actionTypeRegistry: {},
      },
      uiSettings: {
        get: (settings: string) => {
          if (settings === 'dateFormat') return 'YYYY-MM-DD';
          if (settings === 'format:percent:defaultPattern') return '0.0%';
          return '';
        },
      },
      executionContext: {
        get: () => ({
          name: 'slo',
        }),
      },
    },
  });
};

describe('SLO Details Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMonitor.mockReset();
    mockKibana();
    usePermissionsMock.mockReturnValue({
      isLoading: false,
      data: { hasAllReadRequested: true, hasAllWriteRequested: true },
    });
    useCreateDataViewsMock.mockReturnValue({
      dataView: { getName: () => 'dataview', getIndexPattern: () => '.dataview-index' },
    });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: false,
      data: historicalSummaryData,
    });
    useFetchActiveAlertsMock.mockReturnValue({ isLoading: false, data: new ActiveAlerts() });
    useDeleteSloMock.mockReturnValue({ mutate: mockDelete });
    useDeleteSloInstanceMock.mockReturnValue({ mutate: mockDeleteInstance });
    vi.spyOn(Router, 'useLocation').mockReturnValue({
      pathname: '/slos/1234',
      search: '',
      state: '',
      hash: '',
    });
  });

  describe('when the incorrect license is found', () => {
    it('navigates to the SLO welcome page', async () => {
      const slo = buildSlo();
      vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });

      render(<SloDetailsPage />);

      expect(mockNavigate).toHaveBeenCalledWith(paths.slosWelcome);
    });
  });

  describe('when the user has not the requested read permissions ', () => {
    it('navigates to the slos welcome page', async () => {
      const slo = buildSlo();
      vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: { hasAllReadRequested: false, hasAllWriteRequested: false },
      });

      render(<SloDetailsPage />);

      expect(mockNavigate).toHaveBeenCalledWith(paths.slosWelcome);
    });
  });

  it('renders the PageNotFound when the SLO cannot be found', async () => {
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: 'nonexistent' });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: undefined });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
  });

  it('renders the loading spinner when fetching the SLO', async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: true, data: undefined });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('pageNotFound')).toBeFalsy();
    expect(screen.queryByTestId('loadingTitle')).toBeTruthy();
    expect(screen.queryByTestId('sloDetailsLoading')).toBeTruthy();
  });

  it('renders the SLO details page with loading charts when summary data is loading', async () => {
    const slo = buildSlo({ id: HEALTHY_STEP_DOWN_ROLLING_SLO });
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    useFetchHistoricalSummaryMock.mockReturnValue({
      isLoading: true,
      data: [],
    });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
    expect(screen.queryAllByTestId('wideChartLoading').length).toBe(2);
  });

  it('renders the SLO details page with the overview and chart panels', async () => {
    const slo = buildSlo({ id: HEALTHY_STEP_DOWN_ROLLING_SLO });
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('sloDetailsPage')).toBeTruthy();
    expect(screen.queryByTestId('sliChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorBudgetChartPanel')).toBeTruthy();
    expect(screen.queryByTestId('errorRateChart')).toBeTruthy();
    expect(screen.queryAllByTestId('wideChartLoading').length).toBe(0);
  });

  it('warns when a Synthetics monitor interval exceeds the timeslice window', async () => {
    const slo = buildSlo({
      indicator: {
        type: 'sli.synthetics.availability',
        params: {
          index: 'synthetics-*',
          monitorIds: [],
          projects: [],
          tags: [],
        },
      },
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.98,
        timesliceTarget: 0.95,
        timesliceWindow: '1m',
      },
      meta: {
        synthetics: {
          monitorId: 'monitor-with-a-slow-schedule',
          locationId: 'us-east-1',
          configId: 'monitor-with-a-slow-schedule',
        },
      },
    });
    mockGetMonitor.mockResolvedValue({ schedule: { number: '20', unit: 'm' } });
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    expect(await screen.findByTestId('sloSyntheticsTimesliceWindowCallout')).toHaveTextContent(
      'This monitor runs every 20 minutes, but this SLO uses a 1 minute timeslice window. Set the timeslice window to at least the monitor interval to avoid an inflated SLI and reduced burn rates.'
    );
    expect(mockGetMonitor).toHaveBeenCalledWith(
      '/api/synthetics/monitors/monitor-with-a-slow-schedule',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('does not warn when a Synthetics monitor interval is no longer than the timeslice window', async () => {
    const slo = buildSlo({
      indicator: {
        type: 'sli.synthetics.availability',
        params: {
          index: 'synthetics-*',
          monitorIds: [],
          projects: [],
          tags: [],
        },
      },
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.98,
        timesliceTarget: 0.95,
        timesliceWindow: '5m',
      },
      meta: {
        synthetics: {
          monitorId: 'monitor-with-a-matching-schedule',
          locationId: 'us-east-1',
          configId: 'monitor-with-a-matching-schedule',
        },
      },
    });
    mockGetMonitor.mockResolvedValue({ schedule: { number: '5', unit: 'm' } });
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    await waitFor(() => {
      expect(mockGetMonitor).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('sloSyntheticsTimesliceWindowCallout')).not.toBeInTheDocument();
  });

  it('does not look up a Synthetics monitor schedule for a remote SLO', async () => {
    const slo = buildSlo({
      indicator: {
        type: 'sli.synthetics.availability',
        params: {
          index: 'synthetics-*',
          monitorIds: [],
          projects: [],
          tags: [],
        },
      },
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.98,
        timesliceTarget: 0.95,
        timesliceWindow: '1m',
      },
      meta: {
        synthetics: {
          monitorId: 'remote-monitor',
          locationId: 'remote-location',
          configId: 'remote-monitor',
        },
      },
      remote: { remoteName: 'remote-cluster', kibanaUrl: 'https://remote.kibana' },
    });
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('sloDetailsPage')).toBeInTheDocument();
    });
    expect(mockGetMonitor).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sloSyntheticsTimesliceWindowCallout')).not.toBeInTheDocument();
  });

  it("renders a 'Edit' button under actions menu", async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverEdit')).toBeTruthy();
  });

  it("renders a 'Create alert rule' button under actions menu", async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverCreateRule')).toBeTruthy();
  });

  it("renders a 'Manage rules' button under actions menu", async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
    expect(screen.queryByTestId('sloDetailsHeaderControlPopoverManageRules')).toBeTruthy();
  });

  it("renders a 'Clone' button under actions menu", async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

    const button = screen.queryByTestId('sloDetailsHeaderControlPopoverClone');

    expect(button).toBeTruthy();

    fireEvent.click(button!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        paths.sloCreateWithEncodedForm(encodeURIComponent(encode(transformSloToCloneState(slo))))
      );
    });
  });

  it("renders a 'Delete' button under actions menu", async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

    render(<SloDetailsPage />);

    fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

    const button = screen.queryByTestId('sloDetailsHeaderControlPopoverDelete');

    expect(button).toBeTruthy();

    fireEvent.click(button!);

    const deleteModalConfirmButton = screen.queryByTestId(
      'observabilitySolutionSloDeleteModalConfirmButton'
    );

    fireEvent.click(deleteModalConfirmButton!);

    expect(mockDelete).toHaveBeenCalledWith({
      id: slo.id,
      name: slo.name,
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(paths.slos);
    });
  });

  it('renders the Overview tab by default', async () => {
    const slo = buildSlo();
    vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
    useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    useFetchActiveAlertsMock.mockReturnValue({
      isLoading: false,
      data: new ActiveAlerts([[{ id: slo.id, instanceId: ALL_VALUE }, 2]]),
    });

    render(<SloDetailsPage />);

    expect(screen.queryByTestId('overviewTab')).toBeTruthy();
    expect(screen.queryByTestId('overviewTab')?.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByTestId('alertsTab')).toBeTruthy();
    expect(screen.queryByTestId('alertsTab')?.getAttribute('aria-selected')).toBe('false');
  });

  describe('when an APM SLO is loaded', () => {
    it("renders a 'Explore in APM' button under actions menu", async () => {
      const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
      vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
      expect(screen.queryByTestId('sloDetailsHeaderControlPopoverExploreInApm')).toBeTruthy();
    });
  });

  describe('when an Custom Query SLO is loaded', () => {
    it("does not render a 'Explore in APM' button under actions menu", async () => {
      const slo = buildSlo();
      vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: slo.id });
      useFetchSloDetailsMock.mockReturnValue({ isLoading: false, data: slo });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });

      render(<SloDetailsPage />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));
      expect(screen.queryByTestId('sloDetailsHeaderControlPopoverExploreInApm')).toBeFalsy();
    });
  });
});
