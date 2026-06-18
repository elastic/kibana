/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Scrubber, reconstructTrace } from '@kbn/synthtrace-scenario-codegen';
import type { CapturedSource } from '@kbn/synthtrace-scenario-codegen';
import { reconstructInfra } from './reconstruct';
import type { InfraCapturedSource } from './reconstruct';

const at = (offsetMs: number): string =>
  new Date(Date.parse('2024-01-01T00:00:00.000Z') + offsetMs).toISOString();

describe('shared scrubber consistency (infra + APM)', () => {
  it('maps the same raw host name to the same synthetic name across both captures', () => {
    const scrubber = new Scrubber();

    const metricDocs: InfraCapturedSource[] = [
      {
        '@timestamp': at(0),
        'metricset.name': 'cpu',
        host: { name: 'shared-host' },
        system: { cpu: { total: { norm: { pct: 0.5 } } } },
      },
    ];

    const apmDocs: CapturedSource[] = [
      {
        '@timestamp': at(0),
        processor: { event: 'transaction' },
        trace: { id: 'trace-1' },
        transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
        service: { name: 'svc', environment: 'prod', node: { name: 'node-a' } },
        host: { name: 'shared-host' },
        agent: { name: 'go' },
        event: { outcome: 'success' },
      },
    ];

    const infra = reconstructInfra(metricDocs, { scrub: true, scrubber });
    const trace = reconstructTrace(apmDocs, { scrub: true, scrubber });

    expect(infra.hosts).toHaveLength(1);
    expect(trace.services).toHaveLength(1);
    // Same raw host ("shared-host") -> same synthetic name in both captures, so no duplicate host
    // appears on replay.
    expect(infra.hosts[0].name).toBe(trace.services[0].hostName);
  });

  it('is order-independent (APM captured before infra still agrees)', () => {
    const scrubber = new Scrubber();

    const apmDocs: CapturedSource[] = [
      {
        '@timestamp': at(0),
        processor: { event: 'transaction' },
        trace: { id: 'trace-1' },
        transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
        service: { name: 'svc', environment: 'prod', node: { name: 'node-a' } },
        host: { name: 'shared-host' },
        agent: { name: 'go' },
        event: { outcome: 'success' },
      },
    ];

    const metricDocs: InfraCapturedSource[] = [
      {
        '@timestamp': at(0),
        'metricset.name': 'cpu',
        host: { name: 'shared-host' },
        system: { cpu: { total: { norm: { pct: 0.5 } } } },
      },
    ];

    const trace = reconstructTrace(apmDocs, { scrub: true, scrubber });
    const infra = reconstructInfra(metricDocs, { scrub: true, scrubber });

    expect(trace.services[0].hostName).toBe(infra.hosts[0].name);
  });
});
