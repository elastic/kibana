/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
} from '@kbn/management-settings-ids';
import { queryKeys } from '../../query_keys';
import { WorkerDependenciesCallout } from './worker_dependencies_callout';
import { THREAT_REPORT_WORKFLOWS } from './use_worker_dependency_checks';

const ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';
const worker = (id: string) => ({ id });

const setup = ({
  contextEnabled = true,
  discoveryEnabled = true,
  analysisEnabled = true,
  spaceBasePath = '/s/analyst',
} = {}) => {
  const core = coreMock.createStart();
  Object.assign(core.application.capabilities, {
    advancedSettings: { show: true, save: true },
    workflowsManagement: { updateWorkflow: true },
  });
  core.uiSettings.getAll.mockReturnValue({});
  const contextSetting = new BehaviorSubject(contextEnabled);
  const discoverySetting = new BehaviorSubject(discoveryEnabled);
  const analysisSetting = new BehaviorSubject(analysisEnabled);
  (core.uiSettings.get$ as jest.Mock).mockImplementation((id: string) =>
    id === CONTEXT_ENGINE_ENABLED_SETTING_ID
      ? contextSetting
      : id === SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED
      ? analysisSetting
      : discoverySetting
  );
  jest.spyOn(core.http.basePath, 'get').mockReturnValue(spaceBasePath);
  (core.http.get as jest.Mock).mockImplementation(async (path: string) =>
    path === '/api/kibana/settings'
      ? {
          settings: {
            [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED]: {
              userValue: analysisSetting.getValue(),
            },
          },
        }
      : { total: 1 }
  );
  core.http.post.mockResolvedValue(
    [...THREAT_REPORT_WORKFLOWS, { id: ALERT_ANALYSIS_WORKFLOW_ID }].map(({ id }) => ({
      id,
      enabled: true,
    }))
  );
  core.http.put.mockResolvedValue({});
  core.application.getUrlForApp.mockImplementation(
    (appId, options) =>
      `${core.http.basePath.get() === '/' ? '' : core.http.basePath.get()}/app/${appId}${
        options?.path ?? ''
      }`
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const renderCallouts = (
    workers: Array<{ id: string }>,
    surface: 'onboarding' | 'settings' = 'settings'
  ) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={core}>
            <QueryClientProvider client={queryClient}>
              {workers.map((entry) => (
                <WorkerDependenciesCallout key={entry.id} worker={entry} surface={surface} />
              ))}
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

  return { core, contextSetting, discoverySetting, analysisSetting, queryClient, renderCallouts };
};

describe('WorkerDependenciesCallout', () => {
  it('shows the same Context Engine explanation on onboarding and settings, and clears it on change', () => {
    const { contextSetting, renderCallouts } = setup({ contextEnabled: false });
    const hunt = worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID);
    const first = renderCallouts([hunt], 'onboarding');
    expect(screen.getByTestId('alertZeroWorkerDependency-contextEngine')).toHaveTextContent(
      'cannot write coverage records'
    );
    expect(screen.queryByText('Worker setup needs attention')).toBeNull();
    first.unmount();

    renderCallouts([hunt]);
    const callout = screen.getByTestId(`alertZeroWorkerDependencies-settings-${hunt.id}`);
    expect(within(callout).getByText('Worker setup needs attention')).toBeInTheDocument();
    expect(callout).toHaveTextContent('cannot write coverage records');
    expect(within(callout).getByRole('link', { name: /^Open Advanced Settings/ })).toHaveAttribute(
      'href',
      '/s/analyst/app/management/kibana/settings?query=Context%20Engine'
    );
    expect(
      within(screen.getByTestId('alertZeroDependencyDescription-contextEngine')).queryByRole('link')
    ).toBeNull();
    const actions = screen.getByTestId('alertZeroDependencyActions-contextEngine');
    expect(
      within(actions).getByRole('button', { name: 'Enable Context Engine' })
    ).toBeInTheDocument();
    expect(
      within(actions).getByRole('link', { name: /^Open Advanced Settings/ })
    ).toBeInTheDocument();

    act(() => contextSetting.next(true));
    expect(screen.queryByTestId(`alertZeroWorkerDependencies-settings-${hunt.id}`)).toBeNull();
  });

  it.each([
    [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID, 'cannot process coverage records'],
    [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID, 'cannot hand findings'],
    [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID, 'cannot read or update'],
  ])('explains the Context Engine impact for %s', (workerId, impact) => {
    const { renderCallouts } = setup({ contextEnabled: false });
    renderCallouts([worker(workerId)]);
    expect(screen.getByTestId('alertZeroWorkerDependency-contextEngine')).toHaveTextContent(impact);
  });

  it('enables Context Engine in place and clears every affected worker callout', async () => {
    const { core, contextSetting, renderCallouts } = setup({ contextEnabled: false });
    core.uiSettings.set.mockImplementation(async (settingId, value) => {
      if (settingId === CONTEXT_ENGINE_ENABLED_SETTING_ID) contextSetting.next(value);
      return true;
    });
    renderCallouts([
      worker(SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID),
      worker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID),
    ]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Enable Context Engine' })[0]);

    await waitFor(() => {
      expect(core.uiSettings.set).toHaveBeenCalledWith(CONTEXT_ENGINE_ENABLED_SETTING_ID, true);
      expect(screen.queryByTestId('alertZeroWorkerDependency-contextEngine')).toBeNull();
    });
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Context Engine enabled');
  });

  it('keeps the enable button in its loading state until the setting saves', async () => {
    const { core, contextSetting, renderCallouts } = setup({ contextEnabled: false });
    let resolveSave: (value: boolean) => void = () => {};
    core.uiSettings.set.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSave = resolve;
      })
    );
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID)]);
    const button = screen.getByRole('button', { name: 'Enable Context Engine' });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());

    await act(async () => {
      contextSetting.next(true);
      resolveSave(true);
    });
    expect(screen.queryByTestId('alertZeroWorkerDependency-contextEngine')).toBeNull();
  });

  it('keeps a setting link but hides its button without save access', () => {
    const { core, renderCallouts } = setup({ contextEnabled: false });
    Object.assign(core.application.capabilities, {
      advancedSettings: { show: true, save: false },
    });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID)]);
    expect(screen.queryByRole('button', { name: 'Enable Context Engine' })).toBeNull();
    expect(screen.getByRole('link', { name: /^Open Advanced Settings/ })).toBeInTheDocument();
  });

  it('does not offer a one-click update for a server-overridden setting', () => {
    const { core, renderCallouts } = setup({ contextEnabled: false });
    core.uiSettings.isOverridden.mockReturnValue(true);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID)]);
    expect(screen.queryByRole('button', { name: 'Enable Context Engine' })).toBeNull();
  });

  it('keeps the setting visible and reports a failed one-click update', async () => {
    const { core, renderCallouts } = setup({ contextEnabled: false });
    const error = new Error('Forbidden');
    core.uiSettings.set.mockRejectedValue(error);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID)]);
    fireEvent.click(screen.getByRole('button', { name: 'Enable Context Engine' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not enable Context Engine');
    expect(screen.getByTestId('alertZeroWorkerDependency-contextEngine')).toBeInTheDocument();
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Could not enable Context Engine',
    });
  });

  it.each([
    [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID, 'Enable Context Engine', 'Context Engine'],
    [
      SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      'Enable Attack Discovery workflows',
      'Attack Discovery workflows',
    ],
  ])('reports an unsuccessful settings save for %s', async (workerId, buttonLabel, label) => {
    const { core, renderCallouts } = setup({ contextEnabled: false, discoveryEnabled: false });
    core.uiSettings.set.mockResolvedValue(false);
    renderCallouts([worker(workerId)]);

    fireEvent.click(screen.getByRole('button', { name: buttonLabel }));

    expect(await screen.findByRole('alert')).toHaveTextContent(`Could not enable ${label}`);
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: `Could not enable ${label}`,
    });
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(
        `alertZeroWorkerDependency-${
          workerId === SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID
            ? 'contextEngine'
            : 'attackDiscoveryWorkflows'
        }`
      )
    ).toBeInTheDocument();
  });

  it('lists multiple missing checks on a worker without blocking its own status', async () => {
    const { core, renderCallouts } = setup({ contextEnabled: false });
    core.http.post.mockResolvedValue(
      THREAT_REPORT_WORKFLOWS.map(({ id }) => ({ id, enabled: false }))
    );
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)]);

    await waitFor(() => {
      expect(screen.getByTestId('alertZeroWorkerDependency-threatIngest')).toBeInTheDocument();
    });
    expect(screen.getByTestId('alertZeroWorkerDependency-contextEngine')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroWorkerDependency-threatEnrich')).toBeInTheDocument();
    expect(core.http.post).toHaveBeenCalledWith('/api/workflows/mget', {
      version: '2023-10-31',
      body: JSON.stringify({
        ids: THREAT_REPORT_WORKFLOWS.map(({ id }) => id),
        source: ['enabled'],
      }),
    });
  });

  it('does not confuse an omitted or unreadable workflow with a disabled one', async () => {
    const { core, renderCallouts } = setup();
    core.http.post.mockResolvedValue([{ id: THREAT_REPORT_WORKFLOWS[0].id, enabled: false }]);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)]);

    await waitFor(() => {
      expect(screen.getByTestId('alertZeroWorkerDependency-threatEnrich')).toHaveTextContent(
        'Could not verify'
      );
    });
    const disabled = screen.getByTestId('alertZeroWorkerDependency-threatIngest');
    expect(within(disabled).getByRole('link', { name: /^Open workflow/ })).toHaveAttribute(
      'href',
      `/s/analyst/app/workflows/${THREAT_REPORT_WORKFLOWS[0].id}`
    );
    expect(
      within(screen.getByTestId('alertZeroWorkerDependency-threatEnrich')).getByRole('link', {
        name: /^Open Workflows/,
      })
    ).toHaveAttribute('href', '/s/analyst/app/workflows');
  });

  it('enables each disabled global threat workflow with an enablement-only update', async () => {
    const { core, renderCallouts } = setup();
    const [ingest, enrich] = THREAT_REPORT_WORKFLOWS;
    core.http.post
      .mockResolvedValueOnce([
        { id: ingest.id, enabled: false },
        { id: enrich.id, enabled: false },
      ])
      .mockResolvedValueOnce([
        { id: ingest.id, enabled: true },
        { id: enrich.id, enabled: false },
      ])
      .mockResolvedValue([
        { id: ingest.id, enabled: true },
        { id: enrich.id, enabled: true },
      ]);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)]);
    fireEvent.click(await screen.findByRole('button', { name: 'Enable Ingest threat feeds' }));
    await waitFor(() => {
      expect(core.http.put).toHaveBeenCalledWith(`/api/workflows/workflow/${ingest.id}`, {
        version: '2023-10-31',
        body: JSON.stringify({ enabled: true }),
      });
      expect(screen.queryByTestId('alertZeroWorkerDependency-threatIngest')).toBeNull();
    });
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Ingest threat feeds enabled'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enable Enrich threat report' }));
    await waitFor(() => {
      expect(core.http.put).toHaveBeenCalledWith(`/api/workflows/workflow/${enrich.id}`, {
        version: '2023-10-31',
        body: JSON.stringify({ enabled: true }),
      });
      expect(screen.queryByTestId('alertZeroWorkerDependency-threatEnrich')).toBeNull();
    });
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Enrich threat report enabled'
    );
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledTimes(2);
  });

  it('keeps the disabled workflow visible and reports a failed enable attempt', async () => {
    const { core, renderCallouts } = setup();
    core.http.post.mockResolvedValue(
      THREAT_REPORT_WORKFLOWS.map(({ id }) => ({ id, enabled: false }))
    );
    const error = new Error('Forbidden');
    core.http.put.mockRejectedValue(error);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)]);
    fireEvent.click(await screen.findByRole('button', { name: 'Enable Ingest threat feeds' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not enable Ingest threat feeds'
    );
    expect(screen.getByTestId('alertZeroWorkerDependency-threatIngest')).toBeInTheDocument();
    expect(core.http.post).toHaveBeenCalledTimes(1);
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Could not enable Ingest threat feeds',
    });
    expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('keeps workflow remediation as a link without update permission', async () => {
    const { core, renderCallouts } = setup();
    Object.assign(core.application.capabilities, {
      workflowsManagement: { updateWorkflow: false },
    });
    core.http.post.mockResolvedValue(
      THREAT_REPORT_WORKFLOWS.map(({ id }) => ({ id, enabled: false }))
    );
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)]);
    const item = await screen.findByTestId('alertZeroWorkerDependency-threatIngest');
    expect(within(item).queryByRole('button', { name: 'Enable Ingest threat feeds' })).toBeNull();
    expect(within(item).getByRole('link', { name: /^Open workflow/ })).toBeInTheDocument();
  });

  it('checks configured Defend policies, then retries a failed check', async () => {
    const { core, renderCallouts } = setup({ contextEnabled: false });
    core.http.get.mockRejectedValueOnce(new Error('Forbidden')).mockResolvedValue({ total: 0 });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID)]);

    await waitFor(() => {
      expect(screen.getByTestId('alertZeroWorkerDependency-defend')).toHaveTextContent(
        'Could not verify'
      );
    });
    expect(screen.getByTestId('alertZeroWorkerDependency-contextEngine')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry checks' }));

    await waitFor(() => {
      expect(screen.getByTestId('alertZeroWorkerDependency-defend')).toHaveTextContent(
        'No Elastic Defend integration policy'
      );
    });
    expect(core.http.get).toHaveBeenCalledWith('/api/fleet/package_policies', {
      version: '2023-10-31',
      query: { kuery: 'ingest-package-policies.package.name:endpoint', perPage: 1 },
    });
  });

  it('keeps a loading Fleet check out of the missing list', async () => {
    const { core, renderCallouts } = setup();
    let resolvePolicies: (value: { total: number }) => void = () => {};
    core.http.get.mockReturnValue(
      new Promise<{ total: number }>((resolve) => {
        resolvePolicies = resolve;
      })
    );
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID)]);
    await waitFor(() => expect(core.http.get).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('alertZeroWorkerDependency-defend')).toBeNull();

    await act(async () => resolvePolicies({ total: 0 }));
    expect(await screen.findByTestId('alertZeroWorkerDependency-defend')).toHaveTextContent(
      'No Elastic Defend integration policy'
    );
  });

  it('omits the onboarding title for a check that could not be verified', async () => {
    const { core, renderCallouts } = setup();
    core.http.get.mockRejectedValue(new Error('Forbidden'));
    const endpoint = worker(SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID);
    const onboarding = renderCallouts([endpoint], 'onboarding');

    expect(await screen.findByTestId('alertZeroWorkerDependency-defend')).toHaveTextContent(
      'Could not verify'
    );
    expect(screen.queryByText('Could not verify worker setup')).toBeNull();
    onboarding.unmount();

    renderCallouts([endpoint]);
    expect(await screen.findByText('Could not verify worker setup')).toBeInTheDocument();
  });

  it('isolates Fleet results between spaces and uses the default-space destination', async () => {
    const { core, renderCallouts } = setup();
    const first = renderCallouts([worker(SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID)]);
    await waitFor(() => expect(core.http.get).toHaveBeenCalledTimes(1));
    first.unmount();

    jest.spyOn(core.http.basePath, 'get').mockReturnValue('/');
    core.http.get.mockResolvedValue({ total: 0 });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID)]);
    const item = await screen.findByTestId('alertZeroWorkerDependency-defend');
    expect(within(item).getByRole('link')).toHaveAttribute(
      'href',
      '/app/integrations/detail/endpoint/overview'
    );
    expect(core.http.get).toHaveBeenCalledTimes(2);
  });

  it('shows a verification failure for forbidden workflows and clears it after retry', async () => {
    const { core, renderCallouts } = setup();
    core.http.post
      .mockRejectedValueOnce(new Error('Forbidden'))
      .mockResolvedValue(THREAT_REPORT_WORKFLOWS.map(({ id }) => ({ id, enabled: true })));
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID)]);

    await waitFor(() => {
      expect(screen.getByTestId('alertZeroWorkerDependency-threatIngest')).toHaveTextContent(
        'Could not verify'
      );
    });
    expect(screen.getByTestId('alertZeroWorkerDependency-threatEnrich')).toHaveTextContent(
      'Could not verify'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry checks' }));
    await waitFor(() => {
      expect(screen.queryByTestId('alertZeroWorkerDependency-threatIngest')).toBeNull();
    });
    expect(screen.queryByTestId('alertZeroWorkerDependency-threatEnrich')).toBeNull();
  });

  it('checks the Alert Analysis workflow in the callout and links to its settings', async () => {
    const { core, renderCallouts } = setup();
    core.http.post.mockResolvedValue([{ id: ALERT_ANALYSIS_WORKFLOW_ID, enabled: false }]);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)]);
    const item = await screen.findByTestId('alertZeroWorkerDependency-alertAnalysis');
    expect(item).toHaveTextContent('workflow is missing or disabled');
    expect(within(item).getByRole('link')).toHaveAttribute(
      'href',
      '/s/analyst/app/security/rules/alert_analysis_workflow'
    );
    expect(within(item).queryByRole('button', { name: /Enable/ })).toBeNull();
    expect(core.http.post).toHaveBeenCalledWith('/api/workflows/mget', {
      version: '2023-10-31',
      body: JSON.stringify({ ids: [ALERT_ANALYSIS_WORKFLOW_ID], source: ['enabled'] }),
    });
  });

  it('checks the Alert Analysis setting and clears the callout when it changes', async () => {
    const { core, analysisSetting, renderCallouts } = setup({ analysisEnabled: false });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)], 'onboarding');

    const item = await screen.findByTestId('alertZeroWorkerDependency-alertAnalysis');
    expect(item).toHaveTextContent('Alert analysis is off for this space');
    expect(screen.queryByText('Worker setup needs attention')).toBeNull();
    expect(core.http.get).toHaveBeenCalledWith('/api/kibana/settings');

    act(() => analysisSetting.next(true));
    await waitFor(() =>
      expect(screen.queryByTestId('alertZeroWorkerDependency-alertAnalysis')).toBeNull()
    );
  });

  it('uses the saved Alert Analysis setting when the browser cache is stale', async () => {
    const { core, renderCallouts } = setup({ analysisEnabled: true });
    core.http.get.mockResolvedValue({
      settings: {
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED]: { userValue: false },
      },
    });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)]);

    expect(await screen.findByTestId('alertZeroWorkerDependency-alertAnalysis')).toHaveTextContent(
      'Alert analysis is off for this space'
    );
  });

  it('clears the Alert Analysis warning after settings changed through another page', async () => {
    const { core, queryClient, renderCallouts } = setup({ analysisEnabled: false });
    core.http.get.mockResolvedValue({
      settings: {
        [SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED]: { userValue: true },
      },
    });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)]);

    await waitFor(() =>
      expect(
        queryClient.getQueryState(
          queryKeys.workerDependencies.alertAnalysisSetting('/s/analyst', false)
        )?.status
      ).toBe('success')
    );
    expect(core.http.get).toHaveBeenCalledWith('/api/kibana/settings');
    expect(screen.queryByTestId('alertZeroWorkerDependency-alertAnalysis')).toBeNull();
  });

  it('shows a verification message when the Alert Analysis setting cannot be read', async () => {
    const { core, renderCallouts } = setup();
    core.http.get.mockRejectedValue(new Error('Forbidden'));
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)]);

    expect(await screen.findByTestId('alertZeroWorkerDependency-alertAnalysis')).toHaveTextContent(
      'Could not verify'
    );
  });

  it('does not report an unreadable Alert Analysis workflow as disabled and retries it', async () => {
    const { core, renderCallouts } = setup();
    core.http.post
      .mockRejectedValueOnce(new Error('Forbidden'))
      .mockResolvedValue([{ id: ALERT_ANALYSIS_WORKFLOW_ID, enabled: true }]);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)]);

    expect(await screen.findByTestId('alertZeroWorkerDependency-alertAnalysis')).toHaveTextContent(
      'Could not verify'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry checks' }));
    await waitFor(() =>
      expect(screen.queryByTestId('alertZeroWorkerDependency-alertAnalysis')).toBeNull()
    );
    expect(core.http.post).toHaveBeenCalledTimes(2);
  });

  it('does not report an omitted Alert Analysis workflow as disabled', async () => {
    const { core, renderCallouts } = setup();
    core.http.post.mockResolvedValue([]);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID)]);

    expect(await screen.findByTestId('alertZeroWorkerDependency-alertAnalysis')).toHaveTextContent(
      'Could not verify'
    );
  });

  it('uses administrator guidance if Attack Discovery is off at deployment level', () => {
    const { core, renderCallouts } = setup();
    core.featureFlags.useBooleanValue.mockReturnValue(false);
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID)]);
    const item = screen.getByTestId('alertZeroWorkerDependency-attackDiscoveryWorkflows');
    expect(item).toHaveTextContent('Ask an administrator');
    expect(within(item).queryByRole('link')).toBeNull();
  });

  it('links Attack Discovery to its setting and clears the callout when enabled', () => {
    const { core, discoverySetting, renderCallouts } = setup({ discoveryEnabled: false });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID)]);
    const item = screen.getByTestId('alertZeroWorkerDependency-attackDiscoveryWorkflows');
    const link = within(item).getByRole('link', { name: /^Open Advanced Settings/ });
    expect(link).toHaveAttribute(
      'href',
      '/s/analyst/app/management/kibana/settings?query=Attack%20Discovery%20Workflows'
    );
    fireEvent.click(link);
    expect(core.application.navigateToApp).toHaveBeenCalledWith('management', {
      path: '/kibana/settings?query=Attack%20Discovery%20Workflows',
    });
    act(() => discoverySetting.next(true));
    expect(screen.queryByTestId('alertZeroWorkerDependency-attackDiscoveryWorkflows')).toBeNull();
  });

  it('enables Attack Discovery workflows in place when the feature is available', async () => {
    const { core, discoverySetting, renderCallouts } = setup({ discoveryEnabled: false });
    core.uiSettings.set.mockImplementation(async (_settingId, value) => {
      discoverySetting.next(value);
      return true;
    });
    renderCallouts([worker(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID)]);
    fireEvent.click(screen.getByRole('button', { name: 'Enable Attack Discovery workflows' }));

    await waitFor(() => {
      expect(core.uiSettings.set).toHaveBeenCalledWith(
        'securitySolution:enableAttackDiscoveryWorkflows',
        true
      );
      expect(screen.queryByTestId('alertZeroWorkerDependency-attackDiscoveryWorkflows')).toBeNull();
    });
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Attack Discovery workflows enabled'
    );
  });

  it('renders no callout when the checks pass or the worker has no registered dependency', async () => {
    const { core, renderCallouts } = setup();
    renderCallouts([
      worker(SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID),
      worker(SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID),
    ]);
    await waitFor(() => expect(core.http.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Worker setup needs attention')).toBeNull();
    expect(screen.queryByText('Could not verify worker setup')).toBeNull();
  });
});
