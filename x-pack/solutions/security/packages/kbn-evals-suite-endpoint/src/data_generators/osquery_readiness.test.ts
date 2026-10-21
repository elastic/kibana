/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertOsqueryLiveQuerySupported, getOsqueryLiveQueryReadiness } from './osquery_readiness';
import type { KbnClient } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { escapeKuery, escapeQuotes } from '@kbn/es-query';

describe('getOsqueryLiveQueryReadiness', () => {
  it('escapes policy values using the production quoted and unquoted conventions', async () => {
    const id = 'policy*"\\';
    const request = jest
      .fn()
      .mockResolvedValueOnce({ data: { item: { status: 'installed' } } })
      .mockResolvedValueOnce({ data: { items: [{ policy_ids: [id] }] } })
      .mockResolvedValueOnce({ data: { total: 1 } });
    await getOsqueryLiveQueryReadiness({ request } as unknown as KbnClient, new ToolingLog());
    expect(
      new URL(request.mock.calls[2][0].path, 'http://localhost').searchParams.get('kuery')
    ).toBe(`(policy_id:"${escapeQuotes(id)}" or policy_id:${escapeKuery(id)}#*) and status:online`);
  });
  it('selects base and version-suffixed Fleet policy IDs with online status', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({ data: { item: { status: 'installed' } } })
      .mockResolvedValueOnce({
        data: { items: [{ policy_ids: ['policy-1', 'policy-2'] }, { policy_id: 'policy-1' }] },
      })
      .mockImplementationOnce(async ({ path }) => {
        expect(new URL(path, 'http://localhost').searchParams.get('kuery')).toBe(
          '(policy_id:"policy-1" or policy_id:policy-1#* or policy_id:"policy-2" or policy_id:policy-2#*) and status:online'
        );
        return { data: { total: 1 } };
      });
    const readiness = await getOsqueryLiveQueryReadiness(
      { request } as unknown as KbnClient,
      new ToolingLog()
    );
    expect(request).toHaveBeenCalledTimes(3);
    expect(readiness).toEqual({
      packageInstalled: true,
      osqueryAgentPolicyIds: ['policy-1', 'policy-2'],
      onlineOsqueryAgents: 1,
    });
    expect(() => assertOsqueryLiveQuerySupported(readiness, 'suffix agent')).not.toThrow();
  });
});

describe('assertOsqueryLiveQuerySupported', () => {
  it('throws when no online Osquery-capable Fleet agent exists', () => {
    expect(() =>
      assertOsqueryLiveQuerySupported(
        {
          packageInstalled: true,
          osqueryAgentPolicyIds: ['policy-1'],
          onlineOsqueryAgents: 0,
        },
        'Endpoint Forensic Analysis — Osquery live state'
      )
    ).toThrow(
      'Endpoint Forensic Analysis — Osquery live state requires an online Fleet agent enrolled in an Osquery-capable policy'
    );
  });

  it('does not throw when an online Osquery-capable Fleet agent exists', () => {
    expect(() =>
      assertOsqueryLiveQuerySupported(
        {
          packageInstalled: true,
          osqueryAgentPolicyIds: ['policy-1'],
          onlineOsqueryAgents: 1,
        },
        'Endpoint Forensic Analysis — Osquery live state'
      )
    ).not.toThrow();
  });
});
