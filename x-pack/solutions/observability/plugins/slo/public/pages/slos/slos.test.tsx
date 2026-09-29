/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { HeaderMenuPortal, TagsList } from '@kbn/observability-shared-plugin/public';
import { encode } from '@kbn/rison';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Router from 'react-router-dom';
import { historicalSummaryData } from '../../data/slo/historical_summary_data';
import {
  emptySloDefinitionList,
  emptySloList,
  sloDefinitionList,
  sloList,
} from '../../data/slo/slo';
import { useCreateDataView } from '../../hooks/use_create_data_view';
import { useCreateSlo } from '../../hooks/use_create_slo';
import { useDeleteSlo } from '../../hooks/use_delete_slo';
import { useDeleteSloInstance } from '../../hooks/use_delete_slo_instance';
import { useFetchActiveAlerts } from '../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../hooks/use_fetch_rules_for_slo';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useFetchSloList } from '../../hooks/use_fetch_slo_list';
import { useHasSlos } from '../../hooks/use_has_slos';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { useSpace } from '../../hooks/use_space';
import { render } from '../../utils/test_helper';
import { transformSloToCloneState } from '../slo_edit/helpers/transform_slo_to_clone_state';
import { useGetSettings } from '../slo_settings/hooks/use_get_settings';
import { SlosPage } from './slos';

const mockHistoryReplace = vi.fn();
const mockHistoryPush = vi.fn();
const mockUseHistory = vi.fn();

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useParams: vi.fn(),
      useHistory: () => mockUseHistory(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/observability-shared-plugin/public');
vi.mock('../../hooks/use_kibana');
vi.mock('../../hooks/use_composite_slo_enabled', () => {
      const mocked = {
      useCompositeSloEnabled: vi.fn().mockReturnValue(false),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/use_license');
vi.mock('../../hooks/use_fetch_slo_list');
vi.mock('../../hooks/use_fetch_slo_definitions');
vi.mock('../../hooks/use_has_slos');
vi.mock('../../hooks/use_create_slo');
vi.mock('../slo_settings/hooks/use_get_settings');
vi.mock('../../hooks/use_delete_slo');
vi.mock('../../hooks/use_delete_slo_instance');
vi.mock('../../hooks/use_fetch_active_alerts');
vi.mock('../../hooks/use_fetch_historical_summary');
vi.mock('../../hooks/use_fetch_rules_for_slo');
vi.mock('../../hooks/use_get_filtered_rule_types');
vi.mock('../../hooks/use_permissions');
vi.mock('../../hooks/use_create_data_view');
vi.mock('../../hooks/use_space');
vi.mock('./components/slo_list_search_bar');
vi.mock('./components/slo_sparkline', () => {
      const mocked = {
      SloSparkline: () => <div data-test-subj="mockedSparkline" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/ebt-tools');

const useGetSettingsMock = useGetSettings as Mock;
const useKibanaMock = useKibana as Mock;
const useLicenseMock = useLicense as Mock;
const useFetchSloListMock = useFetchSloList as Mock;
const useFetchSloDefinitionsMock = useFetchSloDefinitions as Mock;
const useHasSlosMock = useHasSlos as Mock;
const useCreateSloMock = useCreateSlo as Mock;
const useDeleteSloMock = useDeleteSlo as Mock;
const useDeleteSloInstanceMock = useDeleteSloInstance as Mock;
const useFetchHistoricalSummaryMock = useFetchHistoricalSummary as Mock;
const usePermissionsMock = usePermissions as Mock;
const useFetchActiveAlertsMock = useFetchActiveAlerts as Mock;
const useFetchRulesForSloMock = useFetchRulesForSlo as Mock;
const useGetFilteredRuleTypesMock = useGetFilteredRuleTypes as Mock;
const useSpaceMock = useSpace as Mock;
const useCreateDataViewMock = useCreateDataView as Mock;
const TagsListMock = TagsList as Mock;
const usePerformanceContextMock = usePerformanceContext as Mock;

usePerformanceContextMock.mockReturnValue({ onPageReady: vi.fn() });
TagsListMock.mockReturnValue(<div>Tags list</div>);
const HeaderMenuPortalMock = HeaderMenuPortal as Mock;
HeaderMenuPortalMock.mockReturnValue(<div>Portal node</div>);

const mockCreateSlo = vi.fn();
const mockDeleteSlo = vi.fn();
const mockDeleteInstance = vi.fn();

useCreateSloMock.mockReturnValue({ mutate: mockCreateSlo });
useDeleteSloMock.mockReturnValue({ mutate: mockDeleteSlo });
useDeleteSloInstanceMock.mockReturnValue({ mutate: mockDeleteInstance });
useCreateDataViewMock.mockReturnValue({});
useFetchActiveAlertsMock.mockReturnValue({ data: new Map() });
useFetchRulesForSloMock.mockReturnValue({ data: {} });
useGetFilteredRuleTypesMock.mockReturnValue([]);
useSpaceMock.mockReturnValue('default');

const mockNavigate = vi.fn();
const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();
const mockLocator = vi.fn();

vi.mock('@kbn/response-ops-rule-form/flyout', () => {
      const mocked = {
      RuleFormFlyout: vi.fn(() => <div data-test-subj="add-rule-flyout">Add rule flyout</div>),
    };
      return { ...mocked, default: mocked };
    });

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      theme: {},
      application: { navigateToUrl: mockNavigate },
      charts: chartPluginMock.createSetupContract(),
      data: {
        dataViews: {
          find: vi.fn().mockReturnValue([]),
          get: vi.fn().mockReturnValue([]),
        },
      },
      dataViews: {
        create: vi.fn().mockResolvedValue(42),
      },
      docLinks: {
        links: {
          query: {},
          observability: {
            slo: 'dummy_link',
          },
        },
      },
      http: {
        basePath: {
          prepend: (url: string) => url,
        },
      },
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
      observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
      share: {
        url: {
          locators: {
            get: mockLocator,
          },
        },
      },
      storage: {
        get: () => {},
      },
      triggersActionsUi: {},
      uiSettings: {
        get: (settings: string) => {
          if (settings === 'dateFormat') return 'YYYY-MM-DD';
          if (settings === 'format:percent:defaultPattern') return '0.0%';
          return '';
        },
      },
      unifiedSearch: {
        ui: {
          SearchBar: () => <div>SearchBar</div>,
          QueryStringInput: () => <div>Query String Input</div>,
        },
        autocomplete: {
          hasQuerySuggestions: () => {},
        },
      },
      inspector: { open: vi.fn() },
      executionContext: {
        get: () => ({
          name: 'slo',
        }),
      },
    },
  });
};

describe('SLOs Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryReplace.mockClear();
    mockHistoryPush.mockClear();
    mockUseHistory.mockReturnValue({
      replace: mockHistoryReplace,
      push: mockHistoryPush,
      createHref: (location: any) => {
        if (typeof location === 'string') return location;
        return location.pathname || '/';
      },
      location: { pathname: '/slos', search: '', hash: '', state: undefined },
    });
    mockKibana();
    useGetSettingsMock.mockReturnValue({
      isLoading: false,
      data: {
        useAllRemoteClusters: false,
        selectedRemoteClusters: [],
      },
    });
    usePermissionsMock.mockReturnValue({
      isLoading: false,
      data: { hasAllReadRequested: true, hasAllWriteRequested: true },
    });
    vi
      .spyOn(Router, 'useLocation')
      .mockReturnValue({ pathname: '/slos', search: '', state: '', hash: '' });
    vi
      .spyOn(Router, 'useRouteMatch')
      .mockReturnValue({ url: '/slos', path: '/slos', isExact: true, params: {} });
  });

  describe('when the incorrect license is found', () => {
    beforeEach(() => {
      useFetchSloListMock.mockReturnValue({ isLoading: false, data: emptySloList });
      useFetchSloDefinitionsMock.mockReturnValue({
        isLoading: false,
        data: emptySloDefinitionList,
      });
      useHasSlosMock.mockReturnValue({ hasSlos: false, isLoading: false, isError: false });
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        data: {},
      });
    });

    it('redirects to the SLOs Welcome Page', async () => {
      await act(async () => {
        render(<SlosPage />);
      });

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledWith('/welcome');
      });
    });
  });

  describe('when the correct license is found', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
      useHasSlosMock.mockReturnValue({ hasSlos: true, isLoading: false, isError: false });
    });

    it('redirects to the SLOs Welcome Page when the API has finished loading and there are no results', async () => {
      useHasSlosMock.mockReturnValue({ hasSlos: false, isLoading: false, isError: false });
      useFetchSloDefinitionsMock.mockReturnValue({
        isLoading: false,
        data: emptySloDefinitionList,
      });
      useFetchSloListMock.mockReturnValue({ isLoading: false, data: emptySloList });
      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        data: {},
      });

      await act(async () => {
        render(<SlosPage />);
      });

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledWith('/welcome');
      });
    });

    it('redirects to the SLOs Welcome Page when the user does not have the required read permissions', async () => {
      useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: sloDefinitionList });
      useFetchSloListMock.mockReturnValue({ isLoading: false, data: sloList });
      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        data: historicalSummaryData,
      });
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: { hasAllReadRequested: false, hasAllWriteRequested: false },
      });

      await act(async () => {
        render(<SlosPage />);
      });

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledWith('/welcome');
      });
    });

    it('should have a create new SLO button', async () => {
      useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: sloDefinitionList });
      useFetchSloListMock.mockReturnValue({ isLoading: false, data: sloList });
      useFetchHistoricalSummaryMock.mockReturnValue({
        isLoading: false,
        data: historicalSummaryData,
      });

      await act(async () => {
        render(<SlosPage />);
      });

      expect(await screen.findByText('Create SLO')).toBeTruthy();
    });

    describe('when API has returned results', () => {
      const setupSloListView = async () => {
        useFetchSloDefinitionsMock.mockReturnValue({ isLoading: false, data: sloDefinitionList });
        useFetchSloListMock.mockReturnValue({ isLoading: false, data: sloList });
        useFetchHistoricalSummaryMock.mockReturnValue({
          isLoading: false,
          data: historicalSummaryData,
        });

        await act(async () => {
          render(<SlosPage />);
        });

        const compactViewToggle = await screen.findByTestId('compactView');
        expect(compactViewToggle).toBeTruthy();

        await act(async () => {
          fireEvent.click(compactViewToggle);
        });
      };

      const openRowActionsMenu = async () => {
        const actionsButton = await screen.findByLabelText('All actions, row 1');
        await act(async () => {
          actionsButton.click();
        });
        await waitForEuiPopoverOpen();
      };

      it('renders the SLO list with SLO items', async () => {
        await setupSloListView();
        expect(await screen.findByTestId('sloListViewButton')).toBeTruthy();

        await act(async () => {
          fireEvent.click(screen.getByTestId('sloListViewButton'));
        });

        expect(screen.queryByTestId('slosPage')).toBeTruthy();
        expect(screen.queryByTestId('sloList')).toBeTruthy();
        expect(screen.queryAllByTestId('sloItem')).toBeTruthy();
        expect((await screen.findAllByTestId('sloItem')).length).toBe(sloList.results.length);
      });

      it('allows editing an SLO', async () => {
        await setupSloListView();
        await openRowActionsMenu();

        const button = await screen.findByTestId('sloActionsEdit');

        expect(button).toBeTruthy();

        await act(async () => {
          button.click();
        });

        expect(mockNavigate).toHaveBeenCalledWith(
          `${paths.sloEdit(sloList.results.at(0)?.id || '')}`
        );
      });

      it('allows creating a new rule for an SLO', async () => {
        await setupSloListView();
        await openRowActionsMenu();

        const button = await screen.findByTestId('sloActionsCreateRule');

        expect(button).toBeTruthy();

        await act(async () => {
          button.click();
        });

        expect(await screen.findByTestId('add-rule-flyout')).toBeInTheDocument();
      });

      it('allows managing rules for an SLO', async () => {
        await setupSloListView();
        await openRowActionsMenu();

        const button = await screen.findByTestId('sloActionsManageRules');

        expect(button).toBeTruthy();

        await act(async () => {
          button.click();
        });

        expect(mockLocator).toHaveBeenCalled();
      });

      it('allows deleting an SLO', async () => {
        await setupSloListView();
        await openRowActionsMenu();

        const button = await screen.findByTestId('sloActionsDelete');

        expect(button).toBeTruthy();

        await act(async () => {
          button.click();
        });

        await act(async () => {
          (await screen.findByTestId('observabilitySolutionSloDeleteModalConfirmButton')).click();
        });

        expect(mockDeleteSlo).toHaveBeenCalledWith({
          id: sloList.results.at(0)?.id,
          name: sloList.results.at(0)?.name,
        });
      });

      it('allows cloning an SLO', async () => {
        await setupSloListView();
        await openRowActionsMenu();

        const button = await screen.findByTestId('sloActionsClone');

        expect(button).toBeTruthy();

        await act(async () => {
          button.click();
        });

        await waitFor(() => {
          const slo = sloList.results.at(0);
          expect(mockNavigate).toHaveBeenCalledWith(
            paths.sloCreateWithEncodedForm(
              encodeURIComponent(encode(transformSloToCloneState(slo!)))
            )
          );
        });
      });
    });
  });
});
