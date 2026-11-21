/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BehaviorSubject } from 'rxjs';
import { of } from 'rxjs';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppStatus } from '@kbn/core/public';
import type { PublicAppInfo } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { asSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import {
  ONBOARDING_PLAN_PATH,
  ONBOARDING_RUNTIME_PIN_PATH,
  ONBOARDING_STATUS_PATH,
  SCAN_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { INVENTORY_PACK_NAME } from '@kbn/cloud-security-posture-common/native_vuln_scanner/pack_body';
import type {
  OnboardingPlan,
  OnboardingStatus,
  PolicyStatus,
  SummaryDoc,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { TestProvider } from '../../../test/test_provider';
import { getMockDependencies } from '../../../test/fixtures/get_mock_dependencies';
import { INVENTORY_RETRY_MS, SCAN_START_GRACE_MS, ScannerSettingsPage } from '.';
import { PIN_RESTART_SETTLE_MS } from './apply_onboarding';
import {
  SCANNER_SETTINGS_TEST_SUBJECTS,
  getApplyPolicyTestSubject,
  getCollectInventoryTestSubject,
  getConfirmPolicyTestSubject,
  getPolicyRowTestSubject,
} from './test_subjects';

const OSQUERY_PACKS_PATH = '/api/osquery/packs';
const OSQUERY_LIVE_QUERIES_PATH = '/api/osquery/live_queries';

const BEFORE_YAML = 'agent.monitoring: {}';
const AFTER_YAML = 'agent.monitoring: {}\nosquerybeat.runtime: process';

const policyStatus = (
  overrides: Partial<PolicyStatus> & Pick<PolicyStatus, 'id'>
): PolicyStatus => ({
  name: `Policy ${overrides.id}`,
  packAssigned: false,
  runtimePinned: false,
  agents: { total: 4, online: 3 },
  reportingInventory: 2,
  state: 'not_configured',
  ...overrides,
});

const createStatus = (overrides: Partial<OnboardingStatus> = {}): OnboardingStatus => ({
  license: 'ok',
  pack: { state: 'missing', differences: [], policyIds: [] },
  policies: [policyStatus({ id: 'p1' }), policyStatus({ id: 'p2' })],
  needsOsqueryIntegration: [],
  agentlessPolicies: [],
  lastScan: null,
  schedule: { installed: true, enabled: true },
  scanRunning: false,
  agentsVisible: true,
  agentsTruncated: false,
  ...overrides,
});

const createPlan = (): OnboardingPlan => ({
  pack: { state: 'missing', action: 'create', differences: [], addPolicyIds: ['p1'] },
  policies: [
    {
      id: 'p1',
      name: 'Policy p1',
      outcome: 'change',
      before: BEFORE_YAML,
      after: AFTER_YAML,
      conflicts: [],
    },
    { id: 'p2', name: 'Policy p2', outcome: 'refused', reason: 'managed', conflicts: [] },
  ],
});

const httpError = (status: number, message: string, code?: string) => ({
  response: { status },
  body: { message, attributes: code ? { code } : undefined },
});

interface HttpHandlers {
  /** A function is called on every status request, so a test can change the answer over time. */
  status?: unknown | (() => unknown);
  plan?: unknown;
  scan?: unknown;
  packs?: Array<{ saved_object_id: string; name: string; policy_ids?: string[] }>;
  liveQuery?: unknown;
}

const isError = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'response' in value;

const getRequestBody = (calls: readonly unknown[][], path: string): unknown => {
  const call = calls.find(([calledPath]) => calledPath === path);
  const options = call?.[1];
  if (typeof options !== 'object' || options === null || !('body' in options)) return undefined;
  const { body } = options;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
};

const WORKFLOWS_READ_CAPABILITIES = {
  readWorkflow: true,
  readManagedWorkflow: true,
  readWorkflowExecution: true,
  readManagedWorkflowExecution: true,
};

const workflowsAppInfo = (status: AppStatus) =>
  new Map([['workflows', { id: 'workflows', status } as PublicAppInfo]]);

interface SetupOptions {
  canEditPolicies?: boolean;
  /** `workflowsManagement` UI capabilities of the viewer. */
  workflowsCapabilities?: Record<string, boolean>;
  /** Registered Workflows app status; `null` means the app is not registered. */
  workflowsAppStatus?: AppStatus | null;
  /** Id of the active space. */
  spaceId?: string;
  /** `osquery` UI capabilities of the viewer. */
  osqueryCapabilities?: Record<string, boolean>;
}

const setup = (
  handlers: HttpHandlers = {},
  {
    canEditPolicies = true,
    workflowsCapabilities = WORKFLOWS_READ_CAPABILITIES,
    workflowsAppStatus = AppStatus.accessible,
    spaceId = DEFAULT_SPACE_ID,
    osqueryCapabilities = { readPacks: true, writeLiveQueries: true },
  }: SetupOptions = {}
) => {
  const core = coreMock.createStart();
  Object.assign(core.application.capabilities, {
    workflowsManagement: workflowsCapabilities,
    osquery: osqueryCapabilities,
  });
  core.application.getUrlForApp.mockImplementation(
    (appId, options) => `/app/${appId}${options?.path ?? ''}`
  );
  (core.application.applications$ as BehaviorSubject<Map<string, PublicAppInfo>>).next(
    workflowsAppStatus === null ? new Map() : workflowsAppInfo(workflowsAppStatus)
  );
  const spaces = spacesPluginMock.createStartContract();
  spaces.getActiveSpace$.mockReturnValue(
    of({ id: asSpaceId(spaceId), name: spaceId, disabledFeatures: [] })
  );
  const deps = { ...getMockDependencies(), spaces };
  deps.fleet.authz.fleet.allAgentPolicies = canEditPolicies;

  const calls: string[] = [];
  const respond = async (value: unknown) => {
    if (isError(value)) throw value;
    return value;
  };

  core.http.get.mockImplementation(async (path: unknown) => {
    calls.push(`GET ${path}`);
    if (path === ONBOARDING_STATUS_PATH) {
      const { status } = handlers;
      return respond(typeof status === 'function' ? status() : status ?? createStatus());
    }
    if (path === OSQUERY_PACKS_PATH) return { data: handlers.packs ?? [] };
    throw new Error(`Unexpected GET ${path}`);
  });
  core.http.post.mockImplementation(async (path: unknown) => {
    calls.push(`POST ${path}`);
    if (path === ONBOARDING_PLAN_PATH) return respond(handlers.plan ?? createPlan());
    if (path === ONBOARDING_RUNTIME_PIN_PATH) {
      return {
        results: [
          { id: 'p1', name: 'Policy p1', outcome: 'updated', conflicts: [] },
          { id: 'p2', name: 'Policy p2', outcome: 'refused', reason: 'managed', conflicts: [] },
        ],
      };
    }
    if (path === OSQUERY_PACKS_PATH) return { data: { saved_object_id: 'new-pack' } };
    if (path === OSQUERY_LIVE_QUERIES_PATH) return respond(handlers.liveQuery ?? {});
    if (path === SCAN_PATH) return respond(handlers.scan ?? { executionId: 'run-1' });
    throw new Error(`Unexpected POST ${path}`);
  });
  core.http.put.mockImplementation(async (path: unknown) => {
    calls.push(`PUT ${path}`);
    return { data: { saved_object_id: 'existing-pack' } };
  });

  const view = render(
    <TestProvider core={core} deps={deps}>
      <ScannerSettingsPage />
    </TestProvider>
  );

  return { core, calls, ...view };
};

const waitForPage = () => screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.PAGE);

type User = ReturnType<typeof userEvent.setup>;

const selectRow = async (id: string, user: Pick<User, 'click'> = userEvent) => {
  await user.click(await screen.findByTestId(`checkboxSelectRow-${id}`));
};

const planAndOpenModal = async (user: Pick<User, 'click'> = userEvent) => {
  await waitForPage();
  await selectRow('p1', user);
  await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON));
  return screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_MODAL);
};

describe('ScannerSettingsPage', () => {
  describe('policy table', () => {
    it('renders a row per policy with its counts and state', async () => {
      setup({
        status: createStatus({
          policies: [
            policyStatus({
              id: 'p1',
              packAssigned: true,
              runtimePinned: true,
              reportingInventory: 3,
              state: 'scanned',
            }),
            policyStatus({ id: 'p2' }),
          ],
        }),
      });
      await waitForPage();

      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'name'))).toHaveTextContent(
        'Policy p1'
      );
      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'agents'))).toHaveTextContent(
        '3 / 4'
      );
      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'pack'))).toHaveTextContent('Yes');
      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'runtime'))).toHaveTextContent('Yes');
      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'reporting'))).toHaveTextContent('3');
      expect(screen.getByTestId(getPolicyRowTestSubject('p2', 'pack'))).toHaveTextContent('No');
      expect(screen.getByTestId(getPolicyRowTestSubject('p2', 'name'))).toHaveTextContent(
        'Policy p2'
      );
    });

    it('shows a dash instead of agent counts when agents are not visible', async () => {
      setup({
        status: createStatus({
          agentsVisible: false,
          policies: [policyStatus({ id: 'p1', agents: null, reportingInventory: null })],
        }),
      });
      await waitForPage();

      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'agents'))).toHaveTextContent('—');
      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'reporting'))).toHaveTextContent('—');
      expect(screen.getByTestId(getPolicyRowTestSubject('p1', 'agents'))).not.toHaveTextContent(
        '/'
      );
    });

    it('shows the upgrade prompt when the licence is insufficient', async () => {
      setup({ status: { license: 'insufficient' } });

      expect(
        await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.UPGRADE_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.PAGE)).not.toBeInTheDocument();
    });
  });

  describe('confirm modal', () => {
    it('shows the before and after YAML and the refusal reason from the plan', async () => {
      setup();
      const modal = await planAndOpenModal();

      const changed = within(modal).getByTestId(getConfirmPolicyTestSubject('p1'));
      expect(changed).toHaveTextContent('agent.monitoring: {}');
      expect(changed).toHaveTextContent('osquerybeat.runtime: process');
      expect(within(changed).getByText('Before')).toBeInTheDocument();
      expect(within(changed).getByText('After')).toBeInTheDocument();

      const refused = within(modal).getByTestId(getConfirmPolicyTestSubject('p2'));
      expect(refused).toHaveTextContent('This policy will be skipped');
      expect(refused).toHaveTextContent('This policy is managed by Fleet and cannot be edited.');
      expect(
        within(modal).getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_PACK_ACTION)
      ).toBeInTheDocument();
    });

    it('requests the plan for the selected policies only', async () => {
      const { core } = setup();
      await planAndOpenModal();

      expect(getRequestBody(core.http.post.mock.calls, ONBOARDING_PLAN_PATH)).toEqual({
        policyIds: ['p1'],
      });
    });

    it('closes without applying on cancel', async () => {
      const { calls } = setup();
      await planAndOpenModal();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CANCEL_BUTTON));

      await waitFor(() =>
        expect(
          screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_MODAL)
        ).not.toBeInTheDocument()
      );
      expect(calls).not.toContain(`POST ${ONBOARDING_RUNTIME_PIN_PATH}`);
    });

    it('disables confirm when no policy can be changed', async () => {
      setup({
        plan: {
          pack: { state: 'missing', action: 'create', differences: [], addPolicyIds: [] },
          policies: [
            { id: 'p1', name: 'Policy p1', outcome: 'refused', reason: 'managed', conflicts: [] },
          ],
        } satisfies OnboardingPlan,
      });
      await planAndOpenModal();

      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON)).toBeDisabled();
    });
  });

  describe('apply', () => {
    // Pinning restarts osquerybeat, so the apply waits before the live query.
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const fakeTimerUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const confirmAndSettle = async (user: User) => {
      await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(PIN_RESTART_SETTLE_MS + 100);
      });
    };

    it('pins, creates the missing pack, then runs the live query, and reports the result', async () => {
      const user = fakeTimerUser();
      const { calls } = setup();
      await planAndOpenModal(user);

      await confirmAndSettle(user);

      const results = await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_RESULTS);
      expect(within(results).getByTestId(getApplyPolicyTestSubject('p1'))).toBeInTheDocument();
      expect(within(results).getByTestId(getApplyPolicyTestSubject('p2'))).toHaveTextContent(
        'This policy is managed by Fleet and cannot be edited.'
      );
      expect(
        within(results).getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_PACK_RESULT)
      ).toHaveTextContent('The inventory pack was created');
      expect(
        within(results).getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_LIVE_QUERY_RESULT)
      ).toHaveTextContent('The first inventory was requested');

      const applyCalls = calls.filter(
        (call) =>
          call === `POST ${ONBOARDING_RUNTIME_PIN_PATH}` ||
          call === `GET ${OSQUERY_PACKS_PATH}` ||
          call === `POST ${OSQUERY_PACKS_PATH}` ||
          call.startsWith('PUT ') ||
          call === `POST ${OSQUERY_LIVE_QUERIES_PATH}`
      );
      expect(applyCalls).toEqual([
        `POST ${ONBOARDING_RUNTIME_PIN_PATH}`,
        `GET ${OSQUERY_PACKS_PATH}`,
        `POST ${OSQUERY_PACKS_PATH}`,
        `POST ${OSQUERY_LIVE_QUERIES_PATH}`,
      ]);
    });

    it('updates the existing pack with PUT instead of creating a second one', async () => {
      const user = fakeTimerUser();
      const { calls, core } = setup({
        packs: [{ saved_object_id: 'pack-1', name: INVENTORY_PACK_NAME, policy_ids: ['other'] }],
        plan: {
          pack: { state: 'ok', action: 'add_policies', differences: [], addPolicyIds: ['p1'] },
          policies: createPlan().policies,
        } satisfies OnboardingPlan,
      });
      await planAndOpenModal(user);

      await confirmAndSettle(user);
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_RESULTS);

      expect(calls).toContain('PUT /api/osquery/packs/pack-1');
      expect(calls).not.toContain(`POST ${OSQUERY_PACKS_PATH}`);
      expect(getRequestBody(core.http.put.mock.calls, '/api/osquery/packs/pack-1')).toEqual(
        expect.objectContaining({ policy_ids: expect.arrayContaining(['other', 'p1']) })
      );
      expect(calls.indexOf('PUT /api/osquery/packs/pack-1')).toBeLessThan(
        calls.indexOf(`POST ${OSQUERY_LIVE_QUERIES_PATH}`)
      );
    });

    it('falls back to "daily schedule" text when the live query answers 403', async () => {
      const user = fakeTimerUser();
      setup({ liveQuery: httpError(403, 'Forbidden') });
      await planAndOpenModal(user);

      await confirmAndSettle(user);

      const results = await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_RESULTS);
      expect(
        within(results).getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_LIVE_QUERY_RESULT)
      ).toHaveTextContent('It arrives with the daily schedule.');
      expect(
        within(results).getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_PACK_RESULT)
      ).toHaveTextContent('The inventory pack was created');
      expect(
        screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_ERROR)
      ).not.toBeInTheDocument();
    });
  });

  describe('first inventory', () => {
    const pendingStatus = (overrides: Partial<OnboardingStatus> = {}) =>
      createStatus({
        pack: { state: 'ok', packId: 'pack-1', differences: [], policyIds: ['p1', 'p2'] },
        policies: [
          policyStatus({ id: 'p1', state: 'pending_inventory', packAssigned: true }),
          policyStatus({ id: 'p2', state: 'reporting', packAssigned: true }),
        ],
        ...overrides,
      });

    const getLiveQueryBodies = (core: ReturnType<typeof setup>['core']) => {
      const calls: ReadonlyArray<readonly unknown[]> = core.http.post.mock.calls;
      return calls
        .filter(([path]) => path === OSQUERY_LIVE_QUERIES_PATH)
        .map(([, options]) => {
          if (typeof options !== 'object' || options === null || !('body' in options)) {
            return undefined;
          }
          const { body } = options;
          return typeof body === 'string' ? JSON.parse(body) : undefined;
        });
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const fakeTimerUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const applyAndSettle = async (user: User) => {
      await planAndOpenModal(user);
      await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(PIN_RESTART_SETTLE_MS + 100);
      });
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_RESULTS);
    };

    it('keeps the confirm modal open on close or Escape while the apply waits for the pin to settle', async () => {
      const user = fakeTimerUser();
      setup({ status: () => pendingStatus() });
      await planAndOpenModal(user);
      await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON));

      const modal = screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_MODAL);
      fireEvent.keyDown(modal, { key: 'Escape' });
      await user.click(within(modal).getByLabelText('Closes this modal window'));

      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_MODAL)).toBeInTheDocument();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(PIN_RESTART_SETTLE_MS + 100);
      });
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.APPLY_RESULTS);
      expect(
        screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_MODAL)
      ).not.toBeInTheDocument();
    });

    describe('automatic retry', () => {
      it('requests the inventory once more for the applied policies that are still pending', async () => {
        const user = fakeTimerUser();
        const { core } = setup({ status: () => pendingStatus() });
        await applyAndSettle(user);
        expect(getLiveQueryBodies(core)).toHaveLength(1);

        await act(async () => {
          await jest.advanceTimersByTimeAsync(INVENTORY_RETRY_MS);
        });

        // Only p1 is pending and applied; p2 was refused by the pin and already reports.
        expect(getLiveQueryBodies(core)).toEqual([
          { pack_id: 'new-pack', agent_policy_ids: ['p1'] },
          { pack_id: 'pack-1', agent_policy_ids: ['p1'] },
        ]);
      });

      it('retries only once, however long the policy stays pending', async () => {
        const user = fakeTimerUser();
        const { core } = setup({ status: () => pendingStatus() });
        await applyAndSettle(user);

        await act(async () => {
          await jest.advanceTimersByTimeAsync(INVENTORY_RETRY_MS * 4);
        });

        expect(getLiveQueryBodies(core)).toHaveLength(2);
      });

      it('does not retry a policy that reports by then', async () => {
        const user = fakeTimerUser();
        let current = pendingStatus();
        const { core } = setup({ status: () => current });
        await applyAndSettle(user);

        current = pendingStatus({
          policies: [
            policyStatus({ id: 'p1', state: 'reporting', packAssigned: true }),
            policyStatus({ id: 'p2', state: 'reporting', packAssigned: true }),
          ],
        });
        await act(async () => {
          await jest.advanceTimersByTimeAsync(INVENTORY_RETRY_MS * 2);
        });

        expect(getLiveQueryBodies(core)).toHaveLength(1);
      });

      it('is cancelled when the page unmounts', async () => {
        const user = fakeTimerUser();
        const { core, unmount } = setup({ status: () => pendingStatus() });
        await applyAndSettle(user);

        unmount();
        await act(async () => {
          await jest.advanceTimersByTimeAsync(INVENTORY_RETRY_MS * 2);
        });

        expect(getLiveQueryBodies(core)).toHaveLength(1);
      });

      it('does not run for a viewer who cannot run the pack', async () => {
        const user = fakeTimerUser();
        const { core } = setup({ status: () => pendingStatus() }, { osqueryCapabilities: {} });
        await applyAndSettle(user);

        await act(async () => {
          await jest.advanceTimersByTimeAsync(INVENTORY_RETRY_MS * 2);
        });

        expect(getLiveQueryBodies(core)).toHaveLength(1);
      });

      it('does not run for a viewer who can read packs but not run them', async () => {
        const user = fakeTimerUser();
        const { core } = setup(
          { status: () => pendingStatus() },
          { osqueryCapabilities: { readPacks: true } }
        );
        await applyAndSettle(user);

        await act(async () => {
          await jest.advanceTimersByTimeAsync(INVENTORY_RETRY_MS * 2);
        });

        expect(getLiveQueryBodies(core)).toHaveLength(1);
      });
    });

    describe('"Collect inventory now"', () => {
      it('is shown on pending rows only', async () => {
        setup({ status: pendingStatus() });
        await waitForPage();

        expect(screen.getByTestId(getCollectInventoryTestSubject('p1'))).toBeInTheDocument();
        expect(screen.queryByTestId(getCollectInventoryTestSubject('p2'))).not.toBeInTheDocument();
      });

      it('is hidden when the viewer can only read packs', async () => {
        setup({ status: pendingStatus() }, { osqueryCapabilities: { readPacks: true } });
        await waitForPage();

        expect(screen.queryByTestId(getCollectInventoryTestSubject('p1'))).not.toBeInTheDocument();
      });

      it('is shown when the viewer can read packs and run saved queries', async () => {
        setup(
          { status: pendingStatus() },
          { osqueryCapabilities: { readPacks: true, runSavedQueries: true } }
        );
        await waitForPage();

        expect(screen.getByTestId(getCollectInventoryTestSubject('p1'))).toBeInTheDocument();
      });

      it('is hidden when the viewer cannot read packs', async () => {
        setup({ status: pendingStatus() }, { osqueryCapabilities: { writeLiveQueries: true } });
        await waitForPage();

        expect(screen.queryByTestId(getCollectInventoryTestSubject('p1'))).not.toBeInTheDocument();
      });

      it('is hidden when the pack id is unknown', async () => {
        setup({
          status: pendingStatus({ pack: { state: 'missing', differences: [], policyIds: [] } }),
        });
        await waitForPage();

        expect(screen.queryByTestId(getCollectInventoryTestSubject('p1'))).not.toBeInTheDocument();
      });

      it('requests the inventory of that one policy and reports it', async () => {
        const user = fakeTimerUser();
        const { core } = setup({ status: pendingStatus() });
        await waitForPage();

        await user.click(screen.getByTestId(getCollectInventoryTestSubject('p1')));

        await waitFor(() => expect(core.notifications.toasts.addSuccess).toHaveBeenCalled());
        expect(getLiveQueryBodies(core)).toEqual([{ pack_id: 'pack-1', agent_policy_ids: ['p1'] }]);
      });

      it('explains that the daily schedule delivers it when the live query answers 403', async () => {
        const user = fakeTimerUser();
        const { core } = setup({
          status: pendingStatus(),
          liveQuery: httpError(403, 'Forbidden'),
        });
        await waitForPage();

        await user.click(screen.getByTestId(getCollectInventoryTestSubject('p1')));

        await waitFor(() => expect(core.notifications.toasts.addWarning).toHaveBeenCalled());
        expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith(
          expect.stringContaining('daily schedule')
        );
        expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
      });

      it('says so when no agent of the policy is online', async () => {
        const user = fakeTimerUser();
        const { core } = setup({
          status: pendingStatus(),
          liveQuery: httpError(400, 'No agents found', 'NO_AGENTS_FOUND'),
        });
        await waitForPage();

        await user.click(screen.getByTestId(getCollectInventoryTestSubject('p1')));

        await waitFor(() =>
          expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith(
            expect.stringContaining('No online agents')
          )
        );
      });
    });
  });

  describe('last scan', () => {
    const lastScan: SummaryDoc = {
      '@timestamp': '2026-11-17T08:00:00.000Z',
      run_id: 'run 2/x',
      started_at: '2026-11-17T07:59:00.000Z',
      finished_at: '2026-11-17T08:00:00.000Z',
      status: 'success',
      hosts_scanned: 3,
      findings_open: 1,
      findings_fixed: 0,
      feeds: [],
      failures: [],
    };

    it('links "View run" to the scan workflow execution', async () => {
      const { core } = setup({ status: createStatus({ lastScan }) });

      const link = await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK);

      expect(link).toHaveTextContent('View run');
      expect(link).toHaveAttribute(
        'href',
        '/app/workflows/system-security-native-vuln-scan?tab=executions&executionId=run%202%2Fx'
      );
      expect(core.application.getUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/system-security-native-vuln-scan?tab=executions&executionId=run%202%2Fx',
      });
    });

    it('hides the link when no scan has finished yet', async () => {
      setup({ status: createStatus({ lastScan: null }) });
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.NO_SCAN_YET);

      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK)).toBeNull();
    });

    it('hides the link when the scan has no run id', async () => {
      setup({ status: createStatus({ lastScan: { ...lastScan, run_id: '' } }) });
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.LAST_SCAN_PANEL);

      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK)).toBeNull();
    });

    it('labels a skipped release "Skipped", not "Failed"', async () => {
      setup({
        status: createStatus({
          lastScan: {
            ...lastScan,
            scope: 'refresh',
            feeds: [
              { release: 'ubuntu:noble', status: 'matched' },
              { release: 'rhel:9', status: 'skipped' },
            ],
          },
        }),
      });

      const ubuntuRow = await screen.findByTestId('feed-ubuntu:noble');
      expect(within(ubuntuRow).queryByText('Failed')).toBeNull();
      const rhelRow = screen.getByTestId('feed-rhel:9');
      expect(within(rhelRow).getByText('Skipped')).toBeInTheDocument();
    });

    it.each([
      ['no workflows privileges', () => ({})],
      ...Object.keys(WORKFLOWS_READ_CAPABILITIES).map((missing) => [
        `no ${missing} privilege`,
        () => ({ ...WORKFLOWS_READ_CAPABILITIES, [missing]: false }),
      ]),
    ] as Array<[string, () => Record<string, boolean>]>)(
      'hides the link for a viewer with %s',
      async (_label, getCapabilities) => {
        setup({ status: createStatus({ lastScan }) }, { workflowsCapabilities: getCapabilities() });
        await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.LAST_SCAN_PANEL);

        expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK)).toBeNull();
      }
    );

    it.each([
      ['is not registered', null],
      ['is inaccessible', AppStatus.inaccessible],
    ])('hides the link when the workflows app %s', async (_label, workflowsAppStatus) => {
      setup({ status: createStatus({ lastScan }) }, { workflowsAppStatus });
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.LAST_SCAN_PANEL);

      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK)).toBeNull();
    });

    it('hides the link outside the default space, where the scan workflow is not installed', async () => {
      setup({ status: createStatus({ lastScan }) }, { spaceId: 'other' });
      await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.LAST_SCAN_PANEL);

      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.VIEW_RUN_LINK)).toBeNull();
    });
  });

  describe('scan now', () => {
    it('shows the "already running" message on a 409 SCAN_IN_PROGRESS', async () => {
      setup({
        scan: httpError(409, 'Another scan is running', 'SCAN_IN_PROGRESS'),
      });
      await waitForPage();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON));

      expect(
        await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_ERROR)
      ).toHaveTextContent('A scan is already running. Wait for it to finish.');
    });

    it('shows the server message for an unknown scan error', async () => {
      setup({ scan: httpError(500, 'boom') });
      await waitForPage();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON));

      expect(
        await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_ERROR)
      ).toHaveTextContent('boom');
    });

    describe('while a scan is awaited', () => {
      const SCAN_POLL_INTERVAL_MS = 5000;
      const finishedScan: SummaryDoc = {
        '@timestamp': '2026-11-17T08:00:00.000Z',
        run_id: 'run-2',
        started_at: '2026-11-17T07:59:00.000Z',
        finished_at: '2026-11-17T08:00:00.000Z',
        status: 'success',
        hosts_scanned: 3,
        findings_open: 1,
        findings_fixed: 0,
        feeds: [],
        failures: [],
      };

      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('keeps polling every 5 s past the start grace once the run was seen running', async () => {
        let current = createStatus();
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const { calls } = setup({ status: () => current });
        await waitForPage();

        current = createStatus({ scanRunning: true });
        await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON));
        await waitFor(() =>
          expect(
            screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_RUNNING)
          ).toBeInTheDocument()
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(SCAN_START_GRACE_MS + 1000);
        });
        expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON)).toBeDisabled();
        expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_RUNNING)).toBeInTheDocument();

        // The run ends with a new summary; the next 5 s poll, not a 30 s one, has to see it.
        current = createStatus({ scanRunning: false, lastScan: finishedScan });
        const statusCallsBefore = calls.filter((call) => call.includes(ONBOARDING_STATUS_PATH));
        await act(async () => {
          await jest.advanceTimersByTimeAsync(SCAN_POLL_INTERVAL_MS + 100);
        });

        expect(
          calls.filter((call) => call.includes(ONBOARDING_STATUS_PATH)).length
        ).toBeGreaterThan(statusCallsBefore.length);
        await waitFor(() =>
          expect(
            screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_RUNNING)
          ).not.toBeInTheDocument()
        );
        expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON)).toBeEnabled();
      });

      it('stops waiting after the start grace when the run is never seen running', async () => {
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        setup();
        await waitForPage();

        await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON));
        await waitFor(() =>
          expect(
            screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_RUNNING)
          ).toBeInTheDocument()
        );

        await act(async () => {
          await jest.advanceTimersByTimeAsync(SCAN_START_GRACE_MS + 1000);
        });

        expect(
          screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_RUNNING)
        ).not.toBeInTheDocument();
        expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON)).toBeEnabled();
      });
    });
  });

  describe('status loading', () => {
    it('shows the error callout when the first load fails and there is no data', async () => {
      setup({ status: httpError(500, 'boom') });

      expect(await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ERROR)).toBeInTheDocument();
      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.PAGE)).not.toBeInTheDocument();
    });

    it('keeps the page when a background refetch fails and cached data exists', async () => {
      let failing = false;
      const user = userEvent.setup();
      const { calls } = setup({
        status: () => (failing ? httpError(500, 'boom') : createStatus()),
      });
      await waitForPage();

      failing = true;
      await user.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON));
      await waitFor(() =>
        expect(calls.filter((call) => call.includes(ONBOARDING_STATUS_PATH)).length).toBe(2)
      );
      await act(async () => {});

      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.PAGE)).toBeInTheDocument();
      expect(screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ERROR)).not.toBeInTheDocument();
    });
  });

  describe('read-only mode', () => {
    it('disables editing when the user lacks Fleet agent policy privileges', async () => {
      setup({}, { canEditPolicies: false });
      await waitForPage();

      expect(
        screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.READ_ONLY_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON)).toBeDisabled();
      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON)).toBeDisabled();
      expect(screen.getByTestId('checkboxSelectRow-p1')).toBeDisabled();
    });

    it('switches to read-only when the server answers 403 to Scan now', async () => {
      setup({ scan: httpError(403, 'Forbidden') });
      await waitForPage();
      expect(
        screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.READ_ONLY_CALLOUT)
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON));

      expect(
        await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.READ_ONLY_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.SCAN_NOW_BUTTON)).toBeDisabled();
      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON)).toBeDisabled();
    });

    it('switches to read-only when the server answers 403 to the plan request', async () => {
      setup({ plan: httpError(403, 'Forbidden') });
      await waitForPage();
      expect(
        screen.queryByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.READ_ONLY_CALLOUT)
      ).not.toBeInTheDocument();

      await selectRow('p1');
      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON));

      expect(
        await screen.findByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.READ_ONLY_CALLOUT)
      ).toBeInTheDocument();
      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.PLAN_ERROR)).toBeInTheDocument();
      expect(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON)).toBeDisabled();
    });
  });
});
