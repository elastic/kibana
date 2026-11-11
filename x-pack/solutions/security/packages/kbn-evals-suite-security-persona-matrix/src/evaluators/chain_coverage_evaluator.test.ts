/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput,
} from '@kbn/evals-suite-attack-discovery/src/types';
import {
  CHAIN_COVERAGE_EVALUATOR_NAME,
  createChainCoverageEvaluator,
  KILL_CHAIN_HOSTS,
} from './chain_coverage_evaluator';

const discovery = (text: string) => ({
  title: 'Discovery',
  summaryMarkdown: text,
  detailsMarkdown: '',
  alertIds: ['a'],
});

const run = async (output: AttackDiscoveryTaskOutput) => {
  const evaluator = createChainCoverageEvaluator();
  return evaluator.evaluate({
    input: {} as AttackDiscoveryDatasetExample['input'],
    output,
    expected: undefined,
    metadata: {},
  } as Parameters<typeof evaluator.evaluate>[0]);
};

const allChainDiscoveries = KILL_CHAIN_HOSTS.map((host) =>
  discovery(`Activity on {{ host.name ${host} }}`)
);

describe('ChainCoverage evaluator', () => {
  it('exposes a stable name', () => {
    expect(CHAIN_COVERAGE_EVALUATOR_NAME).toBe('ChainCoverage');
  });

  it('passes when every one of the 8 chains is covered by its own discovery', async () => {
    const result = await run({ insights: allChainDiscoveries });

    expect(result.score).toBe(1);
    expect(result.label).toBe('pass');
    expect(result.metadata).toMatchObject({ recall: 1, precision: 1 });
  });

  it('folds -PRIV twin hosts into the parent chain', async () => {
    const insights = [
      ...allChainDiscoveries.filter((_, index) => KILL_CHAIN_HOSTS[index] !== 'SRVWIN06'),
      discovery('Lateral movement to {{ host.name SRVWIN06-PRIV }}'),
    ];

    const result = await run({ insights });

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ recall: 1 });
  });

  it('does not double-count a duplicate chain and lowers precision', async () => {
    const result = await run({
      insights: [...allChainDiscoveries, discovery('More on {{ host.name SRVWIN04 }}')],
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ recall: 1, precision: 8 / 9 });
  });

  it('fails the label when precision drops below 0.8 even at full recall', async () => {
    const noise = [1, 2, 3].map(() => discovery('No known host here'));
    const result = await run({ insights: [...allChainDiscoveries, ...noise] });

    expect(result.score).toBe(1);
    expect(result.label).toBe('fail');
    expect(result.metadata).toMatchObject({ precision: 8 / 11 });
  });

  it('reports 7/8 when the BPFDoor chain is missing', async () => {
    const result = await run({
      insights: allChainDiscoveries.filter((_, index) => KILL_CHAIN_HOSTS[index] !== 'SRVNIX05'),
    });

    expect(result.score).toBe(7 / 8);
    expect(result.label).toBe('fail');
    expect(result.metadata).toMatchObject({
      recall: 7 / 8,
      chains: expect.objectContaining({ SRVNIX05: false, SRVWIN04: true }),
    });
  });

  it('does not credit a discovery that spans several chains toward precision', async () => {
    const result = await run({
      insights: [discovery('Both {{ host.name SRVWIN01 }} and {{ host.name SRVWIN02 }}')],
    });

    expect(result.metadata).toMatchObject({ recall: 2 / 8, precision: 0 });
  });

  it('pins that a multi-chain discovery lowers precision even when every chain is covered', async () => {
    // Four discoveries each merging two chains cover all 8 chains (recall 1) but
    // none maps to exactly one chain, so precision is 0 and the label fails.
    const insights = [0, 2, 4, 6].map((index) =>
      discovery(
        `{{ host.name ${KILL_CHAIN_HOSTS[index]} }} and {{ host.name ${
          KILL_CHAIN_HOSTS[index + 1]
        } }}`
      )
    );
    const result = await run({ insights });

    expect(result.score).toBe(1);
    expect(result.label).toBe('fail');
    expect(result.metadata).toMatchObject({ recall: 1, precision: 0, discoveries: 4 });
  });

  it('reads snake_case wire docs including the entity summary', async () => {
    const result = await run({
      insights: [
        {
          title: 'x',
          summary_markdown: 'nothing',
          details_markdown: 'nothing',
          entity_summary_markdown: '{{ host.name SRVMAC08 }}',
          alert_ids: [],
        },
      ],
    });

    expect(result.metadata).toMatchObject({ recall: 1 / 8 });
  });

  it('scores 0 for null insights', async () => {
    const result = await run({ insights: null });

    expect(result.score).toBe(0);
    expect(result.label).toBe('fail');
    expect(result.metadata).toMatchObject({ recall: 0, precision: 0 });
  });
});
