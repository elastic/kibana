/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentProps } from 'react';
import type { Alert } from '@kbn/alerting-types';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { allCasesPermissions, noCasesPermissions } from '@kbn/observability-shared-plugin/public';
import { noop } from 'lodash';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { waitFor, act } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { ALERT_FLAPPING } from '@kbn/rule-data-utils';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { createTelemetryClientMock } from '../../services/telemetry/telemetry_client.mock';
import { AlertActions } from './alert_actions';
import { inventoryThresholdAlertEs } from '../../rules/fixtures/example_alerts';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import * as pluginContext from '../../hooks/use_plugin_context';
import type { ConfigSchema, ObservabilityPublicPluginsStart } from '../../plugin';
import { createMemoryHistory } from 'history';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { GetObservabilityAlertsTableProp } from '../..';
import { AlertsTableContextProvider } from '@kbn/response-ops-alerts-table/contexts/alerts_table_context';
import type {
  AdditionalContext,
  AlertDetailsNavigation,
  RenderContext,
} from '@kbn/response-ops-alerts-table/types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const mockUseGetRuleTypesPermissions = jest.fn(() => ({
  authorizedToReadRuleType: (_ruleTypeId: string, _consumer?: string): boolean => true,
  authorizedToReadRuleForAlert: (): boolean => true,
  authorizedToCreateAnyRules: false,
}));
const mockUseInvestigationAvailability = jest.fn(() => true);
jest.mock('@kbn/alerts-ui-shared/src/common/hooks', () => ({
  ...jest.requireActual('@kbn/alerts-ui-shared/src/common/hooks'),
  useGetRuleTypesPermissions: () => mockUseGetRuleTypesPermissions(),
}));
jest.mock('../../hooks/use_investigation_availability', () => ({
  useInvestigationAvailability: () => mockUseInvestigationAvailability(),
}));

const refresh = jest.fn();
const caseHooksReturnedValue = {
  open: () => {
    refresh();
  },
  close: jest.fn(),
};

const mockTelemetryClient = createTelemetryClientMock();
const mockKibana = {
  ...kibanaStartMock.startContract(),
  services: {
    ...kibanaStartMock.startContract().services,
    telemetryClient: mockTelemetryClient,
  },
};
mockKibana.services.cases.hooks.useCasesAddToExistingCaseModal.mockReturnValue(
  caseHooksReturnedValue
);

mockKibana.services.cases.helpers.canUseCases.mockReturnValue(allCasesPermissions());
const mockLicensing = licensingMock.createStart();

const { ObservabilityAIAssistantContextualInsight } =
  observabilityAIAssistantPluginMock.createStartContract();

const prependMock = jest.fn().mockImplementation((args) => args);
mockKibana.services.http.basePath.prepend = prependMock;
mockKibana.services.application.getUrlForApp.mockImplementation(
  (appId: string, { path }: { path?: string } = {}) => `/app/${appId}${path ? `${path}` : ''}`
);

const config: ConfigSchema = {
  unsafe: {
    alertDetails: {
      uptime: { enabled: false },
    },
  },
  managedOtlpServiceUrl: '',
};

const getFormatterMock = jest.fn();
const createRuleTypeRegistryMock = () => ({
  getFormatter: getFormatterMock,
  registerFormatter: () => {},
  list: () => ['ruleType1', 'ruleType2'],
});

export const createObservabilityRuleTypeRegistryMock = () =>
  createRuleTypeRegistryMock() as ObservabilityRuleTypeRegistry &
    ReturnType<typeof createRuleTypeRegistryMock>;

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  core: {} as CoreStart,
  config,
  plugins: {} as ObservabilityPublicPluginsStart,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  ObservabilityAIAssistantContextualInsight,
}));
jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  core: {} as CoreStart,
  config,
  plugins: {} as ObservabilityPublicPluginsStart,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  ObservabilityAIAssistantContextualInsight,
}));

describe('ObservabilityActions component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInvestigationAvailability.mockReturnValue(true);
    getFormatterMock.mockReturnValue(jest.fn().mockReturnValue('a reason'));
    mockTelemetryClient.reportAlertAddedToCase.mockClear();
    mockUseGetRuleTypesPermissions.mockReturnValue({
      authorizedToReadRuleType: () => true,
      authorizedToReadRuleForAlert: () => true,
      authorizedToCreateAnyRules: false,
    });
  });

  interface SetupOptions {
    canWriteAgentBuilder?: boolean;
    alert?: Alert;
  }

  const setup = async (
    pageId: string,
    {
      canWriteAgentBuilder = false,
      alert = { ...inventoryThresholdAlertEs, [ALERT_FLAPPING]: [false] },
    }: SetupOptions = {}
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });

    const alertDetailsNavigation: AlertDetailsNavigation = {
      appId: 'observability',
      getPath: (alertId: string) => `/alerts/${encodeURIComponent(alertId)}`,
    };

    const props: Pick<
      ComponentProps<GetObservabilityAlertsTableProp<'renderActionsCell'>>,
      | 'tableId'
      | 'config'
      | 'alert'
      | 'ecsAlert'
      | 'nonEcsData'
      | 'rowIndex'
      | 'cveProps'
      | 'clearSelection'
      | 'observabilityRuleTypeRegistry'
      | 'refresh'
      | 'alertDetailsNavigation'
    > = {
      tableId: pageId,
      config,
      alert,
      ecsAlert: [],
      nonEcsData: [],
      rowIndex: 1,
      cveProps: {} as unknown as EuiDataGridCellValueElementProps,
      clearSelection: noop,
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      refresh,
      alertDetailsNavigation,
    };

    const services = {
      http: mockKibana.services.http,
      data: mockKibana.services.data,
      notifications: mockKibana.services.notifications,
      application: mockKibana.services.application,
      settings: mockKibana.services.settings,
      cases: mockKibana.services.cases,
      licensing: mockLicensing,
      fieldFormats: fieldFormatsMock,
    };

    const context = {
      services,
    } as unknown as RenderContext<AdditionalContext>;

    const wrapper = mountWithIntl(
      <Router history={createMemoryHistory()}>
        <KibanaContextProvider
          services={{
            ...mockKibana.services,
            application: {
              ...mockKibana.services.application,
              capabilities: {
                ...mockKibana.services.application.capabilities,
                agentBuilder: { write: canWriteAgentBuilder },
              },
            },
          }}
        >
          <AlertsTableContextProvider value={context}>
            <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
              <AlertActions
                {...(props as unknown as ComponentProps<
                  GetObservabilityAlertsTableProp<'renderActionsCell'>
                >)}
                services={services}
              />
            </QueryClientProvider>
          </AlertsTableContextProvider>
        </KibanaContextProvider>
      </Router>
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  };

  it('should hide "View rule details" menu item for rule page id', async () => {
    const wrapper = await setup(RULE_DETAILS_PAGE_ID);
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(0);
    });
  });

  it('should show "View rule details" menu item', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(1);
    });
  });

  it('hides the investigate action without Agent Builder write access', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');

    expect(wrapper.find('[data-test-subj="o11yAlertActionsInvestigate"]').hostNodes()).toHaveLength(
      0
    );
  });

  it('hides the investigate action when no investigation connector is available', async () => {
    mockUseInvestigationAvailability.mockReturnValue(false);
    const wrapper = await setup('nothing', { canWriteAgentBuilder: true });
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');

    expect(wrapper.find('[data-test-subj="o11yAlertActionsInvestigate"]').hostNodes()).toHaveLength(
      0
    );
  });

  it('starts an investigation for the alert', async () => {
    mockKibana.services.http.post.mockResolvedValue({ investigation_id: 'investigation-1' });
    const wrapper = await setup('nothing', { canWriteAgentBuilder: true });
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    wrapper.find('[data-test-subj="o11yAlertActionsInvestigate"]').hostNodes().simulate('click');

    await waitFor(() => {
      expect(mockKibana.services.http.post).toHaveBeenCalledWith(
        '/internal/observability/alerts/6d4c6d74-d51a-495c-897d-88ced3b95e30/investigate'
      );
      expect(mockKibana.services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Investigation started',
      });
    });
  });

  it('reports an investigation request failure', async () => {
    mockKibana.services.http.post.mockRejectedValue(new Error('Request failed'));
    const wrapper = await setup('nothing', { canWriteAgentBuilder: true });
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    wrapper.find('[data-test-subj="o11yAlertActionsInvestigate"]').hostNodes().simulate('click');

    await waitFor(() => {
      expect(mockKibana.services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Failed to start investigation',
        text: 'Request failed',
      });
    });
  });

  it('should hide "View rule details" menu item when unauthorized to read the rule type', async () => {
    mockUseGetRuleTypesPermissions.mockReturnValue({
      authorizedToReadRuleType: () => false,
      authorizedToReadRuleForAlert: () => false,
      authorizedToCreateAnyRules: false,
    });
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(0);
    });
  });

  it('"View alert details" menu item should open alert details page', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj~="viewAlertDetailsPage"]').hostNodes().length).toBe(1);
      expect(wrapper.find('[data-test-subj~="viewAlertDetailsFlyout"]').exists()).toBeFalsy();
    });
  });

  it('should create a valid link for rule details page', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().length).toBe(1);
      expect(wrapper.find('[data-test-subj~="viewRuleDetails"]').hostNodes().prop('href')).toBe(
        '/app/rules/rule/06f53080-0f91-11ed-9d86-013908b232ef'
      );
    });
  });

  it('should open the add-to-case modal', async () => {
    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="add-to-case-action"]').hostNodes().length).toBe(1);
    });
    wrapper.find('[data-test-subj="add-to-case-action"]').hostNodes().simulate('click');

    expect(refresh).toHaveBeenCalled();
  });

  it('should refresh when the add-to-case modal succeeds', async () => {
    await setup('nothing');

    // @ts-expect-error: The object will always be defined
    mockKibana.services.cases.hooks.useCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess({
      updatedAt: null,
    });

    expect(refresh).toHaveBeenCalled();
  });

  it('should report telemetry when creating a case from the modal', async () => {
    await setup('nothing');

    // @ts-expect-error: The object will always be defined
    mockKibana.services.cases.hooks.useCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess({
      updatedAt: null,
    });

    expect(mockTelemetryClient.reportAlertAddedToCase).toHaveBeenCalledWith(
      true,
      'nothing',
      expect.anything()
    );
  });

  it('should report telemetry when selecting an existing case', async () => {
    await setup('nothing');

    // @ts-expect-error: The object will always be defined
    mockKibana.services.cases.hooks.useCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess({
      updatedAt: '2026-08-11T00:00:00.000Z',
    });

    expect(mockTelemetryClient.reportAlertAddedToCase).toHaveBeenCalledWith(
      false,
      'nothing',
      expect.anything()
    );
  });

  it('should hide the case actions without permissions', async () => {
    mockKibana.services.cases.helpers.canUseCases.mockReturnValue(noCasesPermissions());

    const wrapper = await setup('nothing');
    wrapper.find('[data-test-subj="alertsTableRowActionMore"]').hostNodes().simulate('click');

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').hostNodes().length).toBe(0);
  });

  it('should show a valid url when clicking  "View in app"', async () => {
    getFormatterMock.mockReturnValue(
      jest.fn().mockReturnValue({
        reason: 'a reason',
        link: 'http://localhost:5620/app/o11y/log-explorer',
        hasBasePath: false,
      })
    );
    const wrapper = await setup(RULE_DETAILS_PAGE_ID);

    expect(
      wrapper.find('[data-test-subj="o11yAlertActionsButton"]').first().getElement().props.onClick
    ).toBeDefined();

    prependMock.mockClear();

    await waitFor(() => {
      wrapper.find('[data-test-subj="o11yAlertActionsButton"]').first().simulate('mouseover');
      expect(prependMock).toHaveBeenCalledTimes(1);
    });
  });
});
