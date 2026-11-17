/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
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
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { TestProvider } from '../../../test/test_provider';
import { getMockDependencies } from '../../../test/fixtures/get_mock_dependencies';
import { ScannerSettingsPage } from '.';
import {
  SCANNER_SETTINGS_TEST_SUBJECTS,
  getApplyPolicyTestSubject,
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
  status?: unknown;
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

const setup = (handlers: HttpHandlers = {}, { canEditPolicies = true } = {}) => {
  const core = coreMock.createStart();
  const deps = getMockDependencies();
  deps.fleet.authz.fleet.allAgentPolicies = canEditPolicies;

  const calls: string[] = [];
  const respond = async (value: unknown) => {
    if (isError(value)) throw value;
    return value;
  };

  core.http.get.mockImplementation(async (path: unknown) => {
    calls.push(`GET ${path}`);
    if (path === ONBOARDING_STATUS_PATH) return respond(handlers.status ?? createStatus());
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

const selectRow = async (id: string) => {
  await userEvent.click(await screen.findByTestId(`checkboxSelectRow-${id}`));
};

const planAndOpenModal = async () => {
  await waitForPage();
  await selectRow('p1');
  await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.ENABLE_BUTTON));
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
    it('pins, creates the missing pack, then runs the live query, and reports the result', async () => {
      const { calls } = setup();
      await planAndOpenModal();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON));

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
      const { calls, core } = setup({
        packs: [{ saved_object_id: 'pack-1', name: INVENTORY_PACK_NAME, policy_ids: ['other'] }],
        plan: {
          pack: { state: 'ok', action: 'add_policies', differences: [], addPolicyIds: ['p1'] },
          policies: createPlan().policies,
        } satisfies OnboardingPlan,
      });
      await planAndOpenModal();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON));
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
      setup({ liveQuery: httpError(403, 'Forbidden') });
      await planAndOpenModal();

      await userEvent.click(screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON));

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
