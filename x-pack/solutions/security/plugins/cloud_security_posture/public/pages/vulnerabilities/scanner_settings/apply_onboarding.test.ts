/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVENTORY_PACK_BODY,
  INVENTORY_PACK_NAME,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/pack_body';
import type {
  OnboardingPlan,
  PackAction,
  RuntimePinResult,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import type { NativeVulnScannerClient } from '../../../common/api/use_native_vuln_scanner_api';
import { PIN_RESTART_SETTLE_MS, applyOnboarding as applyWithSettle } from './apply_onboarding';

const createClient = () => {
  const calls: string[] = [];
  const track =
    <T>(name: string, value: T) =>
    async (..._args: unknown[]): Promise<T> => {
      calls.push(name);
      return value;
    };

  const client = {
    pinRuntime: jest.fn(track('pinRuntime', { results: [] as RuntimePinResult[] })),
    findPacks: jest.fn(track('findPacks', { data: [] as Array<Record<string, unknown>> })),
    createPack: jest.fn(track('createPack', { data: { saved_object_id: 'new-pack' } })),
    updatePack: jest.fn(track('updatePack', { data: { saved_object_id: 'existing-pack' } })),
    runPackLiveQuery: jest.fn(track('runPackLiveQuery', {})),
  };

  return { client, calls, asClient: client as unknown as NativeVulnScannerClient };
};

const pinResult = (
  id: string,
  outcome: RuntimePinResult['outcome'] = 'updated'
): RuntimePinResult => ({ id, name: id, outcome, conflicts: [] });

const planWith = (action: PackAction): OnboardingPlan => ({
  pack: { state: 'ok', action, differences: [], addPolicyIds: [] },
  policies: [],
});

const httpError = (status: number, message: string, code?: string) => ({
  response: { status },
  body: { message, attributes: code ? { code } : undefined },
});

/** The settle delay is covered on its own; every other test runs without it. */
const applyOnboarding = (
  client: NativeVulnScannerClient,
  plan: OnboardingPlan,
  selectedPolicyIds: string[]
) => applyWithSettle(client, plan, selectedPolicyIds, 0);

describe('applyOnboarding', () => {
  it('pins, creates the missing pack, then runs the live query, in that order', async () => {
    const { client, calls, asClient } = createClient();
    client.pinRuntime.mockImplementationOnce(async () => {
      calls.push('pinRuntime');
      return { results: [pinResult('p1'), pinResult('p2', 'no_change')] };
    });

    const result = await applyOnboarding(asClient, planWith('create'), ['p1', 'p2']);

    expect(calls).toEqual(['pinRuntime', 'findPacks', 'createPack', 'runPackLiveQuery']);
    expect(client.pinRuntime).toHaveBeenCalledWith(['p1', 'p2']);
    expect(client.findPacks).toHaveBeenCalledWith(INVENTORY_PACK_NAME);
    expect(client.createPack).toHaveBeenCalledWith(INVENTORY_PACK_BODY, ['p1', 'p2']);
    expect(client.updatePack).not.toHaveBeenCalled();
    expect(client.runPackLiveQuery).toHaveBeenCalledWith('new-pack', ['p1', 'p2']);
    expect(result.pack).toEqual({ status: 'created', packId: 'new-pack' });
    expect(result.liveQuery).toEqual({ status: 'started' });
  });

  it('ignores a fuzzy search hit whose name is not exactly the pack name', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p1')] });
    client.findPacks.mockResolvedValueOnce({
      data: [{ saved_object_id: 'other', name: `${INVENTORY_PACK_NAME}-copy`, policy_ids: [] }],
    });

    const result = await applyOnboarding(asClient, planWith('create'), ['p1']);

    expect(client.createPack).toHaveBeenCalledTimes(1);
    expect(client.updatePack).not.toHaveBeenCalled();
    expect(result.pack.status).toBe('created');
  });

  it('updates the existing pack with the policies merged, in order pin → PUT → live query', async () => {
    const { client, calls, asClient } = createClient();
    client.pinRuntime.mockImplementationOnce(async () => {
      calls.push('pinRuntime');
      return { results: [pinResult('p2'), pinResult('p3')] };
    });
    client.findPacks.mockImplementationOnce(async () => {
      calls.push('findPacks');
      return {
        data: [
          {
            saved_object_id: 'existing-pack',
            name: INVENTORY_PACK_NAME,
            description: 'Custom description',
            policy_ids: ['p1', 'p2'],
          },
        ],
      };
    });

    const result = await applyOnboarding(asClient, planWith('add_policies'), ['p2', 'p3']);

    expect(calls).toEqual(['pinRuntime', 'findPacks', 'updatePack', 'runPackLiveQuery']);
    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.updatePack).toHaveBeenCalledWith('existing-pack', {
      policy_ids: ['p1', 'p2', 'p3'],
      description: 'Custom description',
      schedule_type: INVENTORY_PACK_BODY.schedule_type,
      interval: INVENTORY_PACK_BODY.interval,
    });
    expect(client.runPackLiveQuery).toHaveBeenCalledWith('existing-pack', ['p2', 'p3']);
    expect(result.pack).toEqual({ status: 'updated', packId: 'existing-pack' });
  });

  it('falls back to the default description when the existing pack has none', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p2')] });
    client.findPacks.mockResolvedValueOnce({
      data: [{ saved_object_id: 'existing-pack', name: INVENTORY_PACK_NAME, policy_ids: ['p1'] }],
    });

    await applyOnboarding(asClient, planWith('add_policies'), ['p2']);

    expect(client.updatePack).toHaveBeenCalledWith('existing-pack', {
      policy_ids: ['p1', 'p2'],
      description: INVENTORY_PACK_BODY.description,
      schedule_type: INVENTORY_PACK_BODY.schedule_type,
      interval: INVENTORY_PACK_BODY.interval,
    });
  });

  it.each<PackAction>(['repair_queries', 'repair_queries_and_add_policies'])(
    'sends the expected queries and schedule for %s',
    async (action) => {
      const { client, asClient } = createClient();
      client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p1')] });
      client.findPacks.mockResolvedValueOnce({
        data: [{ saved_object_id: 'existing-pack', name: INVENTORY_PACK_NAME, policy_ids: ['p1'] }],
      });

      const result = await applyOnboarding(asClient, planWith(action), ['p1']);

      expect(client.updatePack).toHaveBeenCalledWith('existing-pack', {
        policy_ids: ['p1'],
        description: INVENTORY_PACK_BODY.description,
        enabled: INVENTORY_PACK_BODY.enabled,
        schedule_type: 'interval',
        interval: INVENTORY_PACK_BODY.interval,
        queries: INVENTORY_PACK_BODY.queries,
      });
      expect(result.pack.status).toBe('updated');
    }
  );

  it('leaves the pack alone when it already holds every policy, but still runs the live query', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p1', 'no_change')] });
    client.findPacks.mockResolvedValueOnce({
      data: [{ saved_object_id: 'existing-pack', name: INVENTORY_PACK_NAME, policy_ids: ['p1'] }],
    });

    const result = await applyOnboarding(asClient, planWith('no_change'), ['p1']);

    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.updatePack).not.toHaveBeenCalled();
    expect(result.pack).toEqual({ status: 'unchanged', packId: 'existing-pack' });
    expect(client.runPackLiveQuery).toHaveBeenCalledWith('existing-pack', ['p1']);
  });

  it('only sends policies that were pinned to the pack and the live query', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockResolvedValueOnce({
      results: [pinResult('ok'), pinResult('refused', 'refused'), pinResult('bad', 'failed')],
    });

    await applyOnboarding(asClient, planWith('create'), ['ok', 'refused', 'bad']);

    expect(client.createPack).toHaveBeenCalledWith(INVENTORY_PACK_BODY, ['ok']);
    expect(client.runPackLiveQuery).toHaveBeenCalledWith('new-pack', ['ok']);
  });

  it('skips the pack and the live query when no policy could be pinned', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockResolvedValueOnce({
      results: [pinResult('a', 'refused'), pinResult('b', 'not_found')],
    });

    const result = await applyOnboarding(asClient, planWith('create'), ['a', 'b']);

    expect(client.findPacks).not.toHaveBeenCalled();
    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.runPackLiveQuery).not.toHaveBeenCalled();
    expect(result.pack).toEqual({ status: 'not_run' });
    expect(result.liveQuery).toEqual({ status: 'not_run' });
    expect(result.policies).toHaveLength(2);
  });

  it('throws when the pin request fails, before touching osquery', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockRejectedValueOnce(httpError(403, 'forbidden'));

    await expect(applyOnboarding(asClient, planWith('create'), ['p1'])).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(client.findPacks).not.toHaveBeenCalled();
  });

  it('reports a failed pack and does not run the live query', async () => {
    const { client, asClient } = createClient();
    client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p1')] });
    client.createPack.mockRejectedValueOnce(httpError(500, 'pack write failed'));

    const result = await applyOnboarding(asClient, planWith('create'), ['p1']);

    expect(result.pack).toEqual({ status: 'failed', message: 'pack write failed' });
    expect(result.liveQuery).toEqual({ status: 'not_run' });
    expect(client.runPackLiveQuery).not.toHaveBeenCalled();
  });

  describe('settle delay after the pin restart', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('waits for the settle delay before the live query when a pin updated the policy', async () => {
      const { client, asClient } = createClient();
      client.pinRuntime.mockResolvedValueOnce({
        results: [pinResult('p1'), pinResult('p2', 'no_change')],
      });

      const pending = applyWithSettle(asClient, planWith('create'), ['p1', 'p2']);

      await jest.advanceTimersByTimeAsync(PIN_RESTART_SETTLE_MS - 1);
      expect(client.createPack).toHaveBeenCalled();
      expect(client.runPackLiveQuery).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      const result = await pending;
      expect(client.runPackLiveQuery).toHaveBeenCalledWith('new-pack', ['p1', 'p2']);
      expect(result.liveQuery).toEqual({ status: 'started' });
    });

    it('does not wait when every pin was already in place', async () => {
      const { client, asClient } = createClient();
      client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p1', 'no_change')] });

      // No timer is advanced: a wait here would leave the promise pending.
      const result = await applyWithSettle(asClient, planWith('create'), ['p1']);

      expect(client.runPackLiveQuery).toHaveBeenCalledWith('new-pack', ['p1']);
      expect(result.liveQuery).toEqual({ status: 'started' });
    });
  });

  describe('live query errors', () => {
    const run = async (error: unknown) => {
      const { client, asClient } = createClient();
      client.pinRuntime.mockResolvedValueOnce({ results: [pinResult('p1')] });
      client.runPackLiveQuery.mockRejectedValueOnce(error);
      return applyOnboarding(asClient, planWith('create'), ['p1']);
    };

    it('reports no_agents for 400 NO_AGENTS_FOUND', async () => {
      const result = await run(httpError(400, 'No agents found for selection', 'NO_AGENTS_FOUND'));
      expect(result.liveQuery).toEqual({ status: 'no_agents' });
      expect(result.pack.status).toBe('created');
    });

    it('falls back to the schedule (skipped) for another 400', async () => {
      const result = await run(httpError(400, 'bad request'));
      expect(result.liveQuery).toEqual({ status: 'skipped', message: 'bad request' });
    });

    it('falls back to the schedule (skipped) when the user may not run live queries (403)', async () => {
      const result = await run(httpError(403, 'Not allowed to run live queries'));
      expect(result.liveQuery).toEqual({
        status: 'skipped',
        message: 'Not allowed to run live queries',
      });
      expect(result.pack.status).toBe('created');
    });

    it('reports failed for any other error', async () => {
      const result = await run(httpError(500, 'boom'));
      expect(result.liveQuery).toEqual({ status: 'failed', message: 'boom' });
    });
  });
});
