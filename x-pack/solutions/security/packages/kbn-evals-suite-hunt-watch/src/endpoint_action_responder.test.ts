/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0; you may not
 * use this file except in compliance with the Elastic License 2.0.
 */

import { readFileSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import {
  HUNT_AGENT_ID,
  HUNT_HOST_NAME,
  SUSPENDED_PROCESS_PID,
  buildSuspendProcessResponseDoc,
  ensureHuntEndpointMetadata,
  listUnansweredActionIds,
} from './endpoint_action_responder';

const actionHits = (ids: string[]) => ({
  hits: { hits: ids.map((id) => ({ _source: { EndpointActions: { action_id: id } } })) },
});

const readRepoFile = (...segments: string[]): string =>
  readFileSync(Path.join(REPO_ROOT, ...segments), 'utf8');

const packHostCorrelationSource = readRepoFile(
  'x-pack/solutions/security/plugins/security_solution/scripts/data/lib/pack_host_correlation.ts'
);

describe('endpoint action responder', () => {
  it('keys on the same agent, host and process the aws-iam pack seeds', () => {
    // The responder answers actions dispatched to the seeded WIN-ANALYST01 agent and reports
    // the aws.exe pid the process tree names. If the generator drifts (agent id, host name,
    // aws.exe pid), the approve path silently stops working live, so pin the literals here.
    expect(packHostCorrelationSource).toContain(`agentId: '${HUNT_AGENT_ID}'`);
    expect(packHostCorrelationSource).toContain(`hostName: '${HUNT_HOST_NAME}'`);
    expect(packHostCorrelationSource).toContain(`pid: ${SUSPENDED_PROCESS_PID}`);
    expect(packHostCorrelationSource).toContain(`name: 'aws.exe'`);
  });

  it('reports the suspend-process command the action log records', () => {
    const doc = buildSuspendProcessResponseDoc('test-action');
    expect(doc.EndpointActions.data.command).toBe('suspend-process');
    expect(doc.EndpointActions.action_id).toBe('test-action');
    // `ra_suspend-process_success_done` is the code the action-details read treats as success.
    expect(doc.EndpointActions.data.output.content.code).toBe('ra_suspend-process_success_done');
  });

  it('only considers actions dispatched since the approve, newest first, and drops answered ones', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(actionHits(['new-1', 'new-2']))
      .mockResolvedValueOnce(actionHits(['new-1']));
    const esClient = { search } as unknown as Client;
    const since = '2026-11-06T10:00:00.000Z';

    await expect(listUnansweredActionIds({ esClient, since })).resolves.toEqual(['new-2']);

    const [dispatchedRequest] = search.mock.calls[0];
    expect(dispatchedRequest.query.bool.filter).toEqual([
      { term: { 'agent.id': HUNT_AGENT_ID } },
      { range: { '@timestamp': { gte: since } } },
    ]);
    expect(dispatchedRequest.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
    expect(search.mock.calls[1][0].query).toEqual({
      terms: { 'EndpointActions.action_id': ['new-1', 'new-2'] },
    });
  });

  it('skips the response lookup when nothing was dispatched in the window', async () => {
    const search = jest.fn().mockResolvedValueOnce(actionHits([]));
    const esClient = { search } as unknown as Client;

    await expect(
      listUnansweredActionIds({ esClient, since: '2026-11-06T10:00:00.000Z' })
    ).resolves.toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  describe('ensureHuntEndpointMetadata', () => {
    const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;
    const transformClient = (states: Array<[string, string]>, propagatedCount: number) => {
      const transform = {
        getTransformStats: jest
          .fn()
          .mockResolvedValue({ transforms: states.map(([id, state]) => ({ id, state })) }),
        stopTransform: jest.fn().mockResolvedValue({}),
        startTransform: jest.fn().mockResolvedValue({}),
      };
      const esClient = {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue({ count: propagatedCount }),
        transform,
      } as unknown as Client;
      return { esClient, transform };
    };

    afterEach(() => jest.useRealTimers());

    it('force-stops failed transforms before starting them, and starts stopped ones', async () => {
      const { esClient, transform } = transformClient(
        [
          ['endpoint.metadata_united-default-9.6.1', 'failed'],
          ['endpoint.metadata_current-default-9.6.1', 'stopped'],
          ['endpoint.metadata_current-default-9.6.0', 'started'],
        ],
        1
      );

      await ensureHuntEndpointMetadata({ esClient, log });

      expect(transform.stopTransform).toHaveBeenCalledTimes(1);
      expect(transform.stopTransform).toHaveBeenCalledWith({
        transform_id: 'endpoint.metadata_united-default-9.6.1',
        force: true,
      });
      expect(transform.startTransform.mock.calls.map(([req]) => req.transform_id)).toEqual([
        'endpoint.metadata_united-default-9.6.1',
        'endpoint.metadata_current-default-9.6.1',
      ]);
    });

    it('force-reinstalls the installed endpoint package when the united transform is missing', async () => {
      const { esClient } = transformClient(
        [['endpoint.metadata_current-default-9.6.1', 'started']],
        1
      );
      const request = jest
        .fn()
        .mockResolvedValueOnce({ data: { item: { version: '9.6.1' } } })
        .mockResolvedValueOnce({ data: {} });
      const kbnClient = { request } as unknown as KbnClient;

      await ensureHuntEndpointMetadata({ esClient, kbnClient, log });

      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        path: '/api/fleet/epm/packages/endpoint',
      });
      expect(request.mock.calls[1][0]).toMatchObject({
        method: 'POST',
        path: '/api/fleet/epm/packages/endpoint/9.6.1',
        body: { force: true },
      });
    });

    it('reinstalls at most once a minute while the united transform stays missing', async () => {
      jest.useFakeTimers();
      const { esClient } = transformClient(
        [['endpoint.metadata_current-default-9.6.1', 'started']],
        0
      );
      const request = jest.fn().mockResolvedValue({ data: { item: { version: '9.6.1' } } });
      const kbnClient = { request } as unknown as KbnClient;

      const settled = ensureHuntEndpointMetadata({
        esClient,
        kbnClient,
        log,
        maxWaitMs: 70_000,
      }).catch((error: Error) => error);
      await jest.advanceTimersByTimeAsync(75_000);
      await settled;

      const posts = request.mock.calls.filter(([req]) => req.method === 'POST');
      expect(posts).toHaveLength(2);
    });

    it('does not reinstall when the united transform exists', async () => {
      const { esClient } = transformClient(
        [['endpoint.metadata_united-default-9.6.1', 'started']],
        1
      );
      const request = jest.fn();

      await ensureHuntEndpointMetadata({
        esClient,
        kbnClient: { request } as unknown as KbnClient,
        log,
      });

      expect(request).not.toHaveBeenCalled();
    });

    it('names the transform states when the metadata never propagates', async () => {
      jest.useFakeTimers();
      const { esClient } = transformClient(
        [['endpoint.metadata_united-default-9.6.1', 'started']],
        0
      );

      const settled = ensureHuntEndpointMetadata({ esClient, log, maxWaitMs: 1_000 }).catch(
        (error: Error) => error
      );
      await jest.advanceTimersByTimeAsync(5_000);

      expect(String(await settled)).toContain(
        'endpoint transforms: endpoint.metadata_united-default-9.6.1:started'
      );
    });
  });
});
