/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { ILicense } from '@kbn/licensing-types';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { useFetchDataViews } from '@kbn/observability-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { createBrowserHistory } from 'history';
import React from 'react';
import Router from 'react-router-dom';
import { BehaviorSubject } from 'rxjs';
import { buildSlo } from '../../data/slo/slo';
import { useCreateRule } from '../../hooks/use_create_burn_rate_rule';
import { useCreateDataView } from '../../hooks/use_create_data_view';
import { useCreateSlo } from '../../hooks/use_create_slo';
import { useFetchApmSuggestions } from '../../hooks/use_fetch_apm_suggestions';
import { useFetchIndices } from '../../hooks/use_fetch_indices';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { useFetchSloTemplate } from '../../hooks/use_fetch_slo_template';
import { useKibana } from '../../hooks/use_kibana';
import { usePermissions } from '../../hooks/use_permissions';
import { useUpdateSlo } from '../../hooks/use_update_slo';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { SloEditPage } from './slo_edit';
vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-shared-plugin/public');
vi.mock('@kbn/observability-plugin/public');
vi.mock('../../hooks/use_fetch_indices');
vi.mock('../../hooks/use_create_data_view');
vi.mock('../../hooks/use_fetch_slo_details');
vi.mock('../../hooks/use_fetch_slo_template');
vi.mock('../../hooks/use_create_slo');
vi.mock('../../hooks/use_update_slo');
vi.mock('../../hooks/use_fetch_apm_suggestions');
vi.mock('../../hooks/use_permissions');
vi.mock('../../hooks/use_create_burn_rate_rule');

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

vi.mock('../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: vi.fn(() => mockUseKibanaReturnValue),
  };
  return { ...mocked, default: mocked };
});

const useKibanaMock = useKibana as Mock;
const useFetchIndicesMock = useFetchIndices as Mock;
const useFetchDataViewsMock = useFetchDataViews as Mock;
const useCreateDataViewMock = useCreateDataView as Mock;
const useFetchSloDetailsMock = useFetchSloDetails as Mock;
const useFetchSloTemplateMock = useFetchSloTemplate as Mock;
const useCreateSloMock = useCreateSlo as Mock;
const useUpdateSloMock = useUpdateSlo as Mock;
const useCreateRuleMock = useCreateRule as Mock;
const useFetchApmSuggestionsMock = useFetchApmSuggestions as Mock;
const usePermissionsMock = usePermissions as Mock;
const useFetcherMock = useFetcher as Mock;

const mockNavigate = vi.fn();
const mockBasePathPrepend = vi.fn();
const licenseMock = licensingMock.createLicenseMock();

const mockKibana = (license: ILicense | null = licenseMock) => {
  useKibanaMock.mockReturnValue({
    services: {
      theme: {},
      application: {
        navigateToUrl: mockNavigate,
        capabilities: {},
      },
      charts: {
        theme: {
          useChartsBaseTheme: () => {},
        },
      },
      dataViewEditor: {},
      data: {
        dataViews: {
          find: vi.fn().mockReturnValue([]),
          get: vi.fn().mockReturnValue([]),
          getDefault: vi.fn(),
        },
      },
      dataViews: {
        create: vi.fn().mockResolvedValue({
          getIndexPattern: vi.fn().mockReturnValue('some-index'),
          getRuntimeMappings: vi.fn().mockReturnValue({}),
          id: 'some-data-view-id',
        }),
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
          prepend: mockBasePathPrepend,
        },
      },
      notifications: {
        toasts: {
          addError: vi.fn(),
          addSuccess: vi.fn(),
        },
      },
      observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
      storage: {
        get: () => {},
      },
      triggersActionsUi: {},
      uiSettings: {
        get: () => {},
      },
      unifiedSearch: {
        ui: {
          QueryStringInput: () => <div>Query String Input</div>,
          SearchBar: () => <div>Search Bar</div>,
        },
        autocomplete: {
          hasQuerySuggestions: () => {},
        },
      },
      licensing: {
        license$: new BehaviorSubject(license),
      },
      share: sharePluginMock.createStartContract(),
      inspector: { open: vi.fn() },
    },
  });
};

const SLO_ID = 'slo-1234';

describe('SLO Edit Page', () => {
  const mockCreate = vi.fn(() => Promise.resolve({ id: SLO_ID }));
  const mockUpdate = vi.fn();
  const mockCreateRule = vi.fn();

  const history = createBrowserHistory();

  beforeEach(() => {
    vi.clearAllMocks();
    mockKibana();

    // Silence all the ref errors in Eui components.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    history.replace('');
    vi.spyOn(Router, 'useHistory').mockReturnValue(history);

    useFetchDataViewsMock.mockReturnValue({
      isLoading: false,
      data: [
        {
          getName: () => 'dataview',
          getIndexPattern: () => 'some-index',
          getRuntimeMappings: vi.fn().mockReturnValue({}),
        },
      ],
    });

    useCreateDataViewMock.mockReturnValue({
      dataView: {
        getName: () => 'dataview',
        getIndexPattern: () => 'some-index',
        getRuntimeMappings: vi.fn().mockReturnValue({}),
        fields: [{ name: 'custom_timestamp', type: 'date' }],
      },
      loading: false,
    });

    useFetchIndicesMock.mockReturnValue({
      isLoading: false,
      data: ['some-index', 'index-2'],
    });

    useCreateSloMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockCreate,
    });

    useCreateRuleMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutate: mockCreateRule,
    });

    useUpdateSloMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockUpdate,
    });

    usePermissionsMock.mockReturnValue({
      isLoading: false,
      data: {
        hasAllWriteRequested: true,
        hasAllReadRequested: true,
      },
    });
    licenseMock.hasAtLeast.mockReturnValue(true);
    useFetcherMock.mockReturnValue({ data: undefined, isLoading: false });
  });

  afterEach(cleanup);

  describe('create SLO flow', () => {
    beforeEach(() => {
      vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });
      vi.spyOn(Router, 'useLocation').mockReturnValue({
        pathname: '/slos/create',
        search: '',
        state: '',
        hash: '',
      });
      useFetchSloDetailsMock.mockReturnValue({ isInitialLoading: false, data: undefined });
      useFetchSloTemplateMock.mockReturnValue({ isInitialLoading: false, data: undefined });
    });

    it('with invalid license triggers a redirect to the SLO Welcome page', async () => {
      licenseMock.hasAtLeast.mockReturnValue(false);

      render(<SloEditPage />);

      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slosWelcome));
    });

    it('with no read permission triggers a redirect to the SLO welcome page', async () => {
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: {
          hasAllWriteRequested: false,
          hasAllReadRequested: false,
        },
      });

      render(<SloEditPage />);

      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slosWelcome));
    });

    it('with no write permission triggers a redirect to the SLO List page', async () => {
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: {
          hasAllWriteRequested: false,
          hasAllReadRequested: true,
        },
      });

      render(<SloEditPage />);

      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slos));
    });

    it('renders an empty SLO Edit Form', async () => {
      const { queryByTestId } = render(<SloEditPage />);

      expect(queryByTestId('sloEditPage')).toBeTruthy();
      expect(queryByTestId('sloForm')).toBeTruthy();

      expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
      // Show default values from the kql indicator
      expect(queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue('sli.kql.custom');
      expect(queryByTestId('indexSelectionSelectedValue')).toBeNull();

      // other sections are hidden
      expect(queryByTestId('sloEditFormObjectiveSection')).toBeNull();
      expect(queryByTestId('sloEditFormDescriptionSection')).toBeNull();
    });

    it('renders the SLO Edit Form with prefilled values from the URL', async () => {
      history.replace(
        '/slos/create?_a=(name:CartServiceLatency,indicator:(params:(environment:prod,service:cartService),type:sli.apm.transactionDuration))'
      );

      useFetchApmSuggestionsMock.mockReturnValue({
        suggestions: ['cartService'],
        isLoading: false,
      });

      const { queryByTestId, getByTestId } = render(<SloEditPage />);

      expect(queryByTestId('sloEditPage')).toBeTruthy();
      expect(queryByTestId('sloForm')).toBeTruthy();

      expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
      expect(queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(
        'sli.apm.transactionDuration'
      );
      expect(queryByTestId('apmLatencyServiceSelector')).toHaveTextContent('cartService');
      expect(queryByTestId('apmLatencyEnvironmentSelector')).toHaveTextContent('prod');

      expect(queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
      expect(queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

      expect(getByTestId('sloFormSubmitButton')).toBeEnabled();

      await waitFor(() => {
        fireEvent.click(getByTestId('sloFormSubmitButton'));
      });

      expect(mockCreate).toHaveBeenCalled();
    });

    it('renders the SLO Edit Form with prefilled values from a template', async () => {
      history.replace('/slos/create?fromTemplateId=template-1234');

      const sloTemplate = {
        templateId: 'template-1234',
        name: 'My template',
        description: 'This is my template',
        indicator: {
          type: 'sli.kql.custom',
          params: {
            index: 'some-index',
            filter: 'template: foo',
            good: 'http_status: 2xx',
            total: 'http_status: *',
            timestampField: '@timestamp',
          },
        },
        budgetingMethod: 'occurrences',
        objective: {
          target: 0.95,
        },
      };
      useFetchSloTemplateMock.mockReturnValue({ isInitialLoading: false, data: sloTemplate });

      const { queryByTestId, getByTestId } = render(<SloEditPage />);

      expect(queryByTestId('sloEditPage')).toBeTruthy();
      expect(queryByTestId('sloForm')).toBeTruthy();

      expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
      expect(queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue('sli.kql.custom');
      expect(queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
      expect(queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

      expect(queryByTestId('sloFormNameInput')).toHaveValue('My template');
      expect(queryByTestId('sloFormDescriptionTextArea')).toHaveValue('This is my template');

      expect(getByTestId('sloFormSubmitButton')).toBeEnabled();

      await waitFor(() => {
        fireEvent.click(getByTestId('sloFormSubmitButton'));
        expect(mockCreate).toHaveBeenCalled();
      });
    });

    it('allows Synthetics availability SLOs to use timeslices with guidance about the monitor interval', async () => {
      const { getByTestId, queryByText, getByText } = render(<SloEditPage />);

      fireEvent.change(getByTestId('sloFormIndicatorTypeSelect'), {
        target: { value: 'sli.synthetics.availability' },
      });

      await waitFor(() => {
        expect(getByTestId('sloFormBudgetingMethodSelect')).toBeEnabled();
      });

      expect(
        queryByText('Match the timeslice window to the monitor interval')
      ).not.toBeInTheDocument();

      fireEvent.change(getByTestId('sloFormBudgetingMethodSelect'), {
        target: { value: 'timeslices' },
      });

      expect(getByTestId('sloFormObjectiveTimesliceTargetInput')).toBeEnabled();
      expect(getByTestId('sloFormObjectiveTimesliceWindowInput')).toBeEnabled();
      expect(getByText('Match the timeslice window to the monitor interval')).toBeInTheDocument();
      expect(
        getByText(
          'Set the timeslice window to at least the monitor run interval. A shorter window can cause periods without monitor executions to inflate the calculated SLI and reduce burn rates.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('edit SLO flow', () => {
    let slo: SLOWithSummaryResponse;
    beforeEach(() => {
      vi.spyOn(Router, 'useParams').mockReturnValue({ sloId: SLO_ID });
      vi.spyOn(Router, 'useLocation').mockReturnValue({
        pathname: `/slos/edit/${SLO_ID}`,
        search: '',
        state: '',
        hash: '',
      });
      slo = buildSlo({ id: SLO_ID });
      useFetchSloDetailsMock.mockReturnValue({ isInitialLoading: false, data: slo });
      useFetchSloTemplateMock.mockReturnValue({ isInitialLoading: false, data: undefined });
    });

    it('with invalid license triggers a redirect to the SLO welcome page', async () => {
      licenseMock.hasAtLeast.mockReturnValue(false);

      render(<SloEditPage />);

      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slosWelcome));
    });

    it('with no read permission triggers a redirect to the SLO welcome page', async () => {
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: {
          hasAllWriteRequested: false,
          hasAllReadRequested: false,
        },
      });

      render(<SloEditPage />);

      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slosWelcome));
    });

    it('with no write permission triggers a redirect to the SLO List page', async () => {
      usePermissionsMock.mockReturnValue({
        isLoading: false,
        data: {
          hasAllWriteRequested: false,
          hasAllReadRequested: true,
        },
      });
      render(<SloEditPage />);

      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slos));
    });

    it('prefills the form with the SLO values', async () => {
      const { queryByTestId } = render(<SloEditPage />);

      expect(queryByTestId('sloEditPage')).toBeTruthy();
      expect(queryByTestId('sloForm')).toBeTruthy();

      // all sections are visible
      expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
      expect(queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
      expect(queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

      expect(queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(slo.budgetingMethod);
      expect(queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(slo.timeWindow.duration);
      expect(queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(slo.objective.target * 100);

      expect(queryByTestId('sloFormNameInput')).toHaveValue(slo.name);
      expect(queryByTestId('sloFormDescriptionTextArea')).toHaveValue(slo.description);
    });

    it('allows editing Synthetics availability SLOs with timeslices', async () => {
      slo = buildSlo({
        id: SLO_ID,
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
      });
      useFetchSloDetailsMock.mockReturnValue({ isInitialLoading: false, data: slo });

      const { getByTestId } = render(<SloEditPage />);

      expect(getByTestId('sloFormBudgetingMethodSelect')).toHaveValue('timeslices');
      expect(getByTestId('sloFormBudgetingMethodSelect')).toBeEnabled();
      expect(getByTestId('sloFormObjectiveTimesliceTargetInput')).toHaveValue(95);
      expect(getByTestId('sloFormObjectiveTimesliceWindowInput')).toHaveValue(5);
    });

    it('calls the updateSlo hook if all required values are filled in', async () => {
      const { getByTestId } = render(<SloEditPage />);

      expect(getByTestId('sloFormSubmitButton')).toBeEnabled();

      await waitFor(() => {
        fireEvent.click(getByTestId('sloFormSubmitButton'));
      });

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(mockBasePathPrepend(paths.slos));
    });
  });
});
