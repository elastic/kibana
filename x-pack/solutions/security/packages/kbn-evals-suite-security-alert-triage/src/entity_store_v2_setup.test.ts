/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type supertest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import { teardownEntityStoreV2 } from './entity_store_v2_setup';

const buildLog = (): jest.Mocked<Pick<ToolingLog, 'warning'>> =>
  ({ warning: jest.fn() } as unknown as jest.Mocked<Pick<ToolingLog, 'warning'>>);

const buildAgentStub = ({ status = 200, body = {} }: { status?: number; body?: unknown } = {}) => {
  const send = jest.fn().mockResolvedValue({ status, body });
  const chain = { set: jest.fn(), send };
  chain.set.mockReturnValue(chain);

  const post = jest.fn().mockReturnValue(chain);
  const del = jest.fn().mockReturnValue(chain);

  return {
    agent: { post, delete: del } as unknown as supertest.Agent,
    post,
    del,
    send,
  };
};

describe('teardownEntityStoreV2', () => {
  it('uninstalls through the Entity Store V2 API', async () => {
    const { agent, post, del, send } = buildAgentStub();
    const log = buildLog();

    await teardownEntityStoreV2({ supertest: agent, log: log as unknown as ToolingLog });

    expect(post).toHaveBeenCalledWith('/api/security/entity_store/uninstall');
    expect(send).toHaveBeenCalledWith({ entityTypes: ['user', 'host'] });
    // `/api/entity_store/engines` no longer exists — teardown used to no-op silently against it.
    expect(del).not.toHaveBeenCalled();
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when the uninstall responds with an error status', async () => {
    const { agent } = buildAgentStub({ status: 500, body: { message: 'boom' } });
    const log = buildLog();

    await expect(
      teardownEntityStoreV2({ supertest: agent, log: log as unknown as ToolingLog })
    ).resolves.toBeUndefined();

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Entity Store V2 uninstall failed')
    );
  });

  it('warns instead of throwing when the request itself fails', async () => {
    const send = jest.fn().mockRejectedValue(new Error('socket hang up'));
    const chain = { set: jest.fn(), send };
    chain.set.mockReturnValue(chain);
    const agent = { post: jest.fn().mockReturnValue(chain) } as unknown as supertest.Agent;
    const log = buildLog();

    await expect(
      teardownEntityStoreV2({ supertest: agent, log: log as unknown as ToolingLog })
    ).resolves.toBeUndefined();

    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('socket hang up'));
  });
});
