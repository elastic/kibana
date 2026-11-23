/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  metadataCurrentIndexPattern,
  METADATA_UNITED_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { SCENARIOS, seedScenario, waitForTransformPropagation } from './endpoint_data';

describe('waitForTransformPropagation', () => {
  it('counts only united docs that endpoint lookups can see', async () => {
    const count = jest.fn().mockResolvedValue({ count: 2 });
    const esClient = { count } as unknown as Client;

    await waitForTransformPropagation(
      esClient,
      new ToolingLog(),
      { metadataCurrent: 2, metadataUnited: 2 },
      1_000,
      'eval-agent-era-'
    );

    const queryFor = (index: string) =>
      count.mock.calls.find(([request]) => request.index === index)?.[0].query;

    expect(queryFor(metadataCurrentIndexPattern)).toEqual({
      prefix: { 'agent.id': 'eval-agent-era-' },
    });
    // A prefix-only count passes once the transform writes a half-merged doc,
    // which list/resolve tools still filter out.
    expect(queryFor(METADATA_UNITED_INDEX)).toMatchObject({
      bool: {
        filter: expect.arrayContaining([
          { prefix: { 'agent.id': 'eval-agent-era-' } },
          expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { exists: { field: 'united.endpoint.agent.id' } },
                { exists: { field: 'united.agent.agent.id' } },
                { term: { 'united.agent.active': { value: true } } },
              ]),
            }),
          }),
        ]),
      },
    });
  });
});

// Both halves of the contract are asserted: omitting the field is the original
// bug (hosts merged from one side), adding it to the metadata doc is the
// regression that kills the `metadata_current` transform.
describe('endpoint_data seeded documents', () => {
  it('stamps `updated_at` on the agent doc only', async () => {
    const create = jest.fn().mockResolvedValue({ result: 'created' });
    const index = jest.fn().mockResolvedValue({ result: 'created' });
    const clients = {
      esClient: { create },
      internalEsClient: { index },
    } as unknown as Parameters<typeof seedScenario>[0];

    await seedScenario(clients, {
      agentId: 'eval-agent-era-1',
      hostName: 'era-seed-test-host',
      os: { name: 'Windows', version: '11' },
      policyName: 'era-seed-test-policy',
      policyStatus: 'success',
      policyId: 'era-seed-test-policy-id',
    });

    const metadataDoc = create.mock.calls[0][0].document;
    const agentDoc = index.mock.calls[0][0].document;
    expect(agentDoc.updated_at).toEqual(agentDoc['@timestamp']);
    expect(metadataDoc).not.toHaveProperty('updated_at');
  });
});

// The endpoint actions data streams type `error` as an ECS object; a bare
// string fails index-time validation and breaks both suites' setup.
describe('endpoint_data seeded isolation failure documents', () => {
  const extraDocs = SCENARIOS.routingUnhealthyHost.extraDocuments ?? [];

  it('seeds the failed isolate action with an error object carrying a message', () => {
    const actionDoc = extraDocs.find((doc) => doc.index === '.logs-endpoint.actions-default');
    expect(actionDoc).toBeDefined();
    expect(actionDoc?.document.error).toEqual({
      message: expect.any(String),
    });
  });

  it('seeds the failed isolate action response with an error object carrying a message', () => {
    const responseDoc = extraDocs.find(
      (doc) => doc.index === '.logs-endpoint.action.responses-default'
    );
    expect(responseDoc).toBeDefined();
    expect(responseDoc?.document.error).toEqual({
      message: expect.any(String),
    });
  });
});
