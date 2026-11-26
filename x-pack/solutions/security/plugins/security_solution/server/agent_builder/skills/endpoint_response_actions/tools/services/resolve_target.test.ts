/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointLookupResult, EndpointLookupService } from './endpoint_lookup';
import { resolveDispatchTarget } from './resolve_target';

describe('resolveDispatchTarget by ip', () => {
  const candidates = [
    { agentId: 'agent-a', status: 'healthy' as const },
    { agentId: 'agent-b', status: 'healthy' as const },
  ];

  const resolveAmbiguousIp = async (ambiguous: EndpointLookupResult) => {
    const lookup = {
      resolveByIp: jest.fn().mockResolvedValue(ambiguous),
    } as unknown as EndpointLookupService;
    const resolved = await resolveDispatchTarget(lookup, 'isolate', { ip: '10.0.0.7' });
    if (resolved.kind !== 'respond') {
      throw new Error('Expected a respond outcome');
    }
    return resolved.data as { reason: string; message: string; truncated?: true };
  };

  it('says several endpoints use the address when the candidate set is complete', async () => {
    const data = await resolveAmbiguousIp({ kind: 'ambiguous', candidates });

    expect(data.reason).toBe('ambiguous_ip');
    expect(data.truncated).toBeUndefined();
    expect(data.message).toContain('Multiple endpoints use the IP address "10.0.0.7"');
  });

  it('says the address could not be fully examined when the candidate set is truncated', async () => {
    const data = await resolveAmbiguousIp({
      kind: 'ambiguous',
      candidates,
      truncated: true,
      totalCandidates: 50,
    });

    expect(data.reason).toBe('ambiguous_ip');
    expect(data.truncated).toBe(true);
    expect(data.message).toContain('than could be examined');
    expect(data.message).not.toContain('Multiple endpoints use');
    expect(data.message).toContain('agentId');
  });

  it.each([
    ['FE80:0:0:0:0:0:0:1', 'fe80::1'],
    ['fe80::0001', 'fe80::1'],
    ['fe80::1', 'fe80::1'],
    ['10.0.0.7', '10.0.0.7'],
  ])('echoes %s as the canonical %s when no endpoint holds it', async (spelling, canonical) => {
    const lookup = {
      resolveByIp: jest.fn().mockResolvedValue({ kind: 'not_found' }),
    } as unknown as EndpointLookupService;

    const resolved = await resolveDispatchTarget(lookup, 'isolate', { ip: spelling });

    expect(lookup.resolveByIp).toHaveBeenCalledWith(canonical);
    expect(resolved).toMatchObject({
      kind: 'respond',
      data: { ip: canonical, message: `No endpoint found with IP address '${canonical}'.` },
    });
  });
});
