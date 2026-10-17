/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { existsSync, readFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');
const WORKER_CHAIN_CONFIG_SET = 'evals_alertzero_worker_chain';

const suiteEntry = (id: string) => {
  const { suites } = JSON.parse(
    readFileSync(join(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
  ) as { suites: Array<{ id: string; serverConfigSet?: string }> };
  return suites.find((suite) => suite.id === id);
};

describe('worker-chain server config (B1)', () => {
  it('runs on its own config set, not the one other suites share', () => {
    expect(suiteEntry('security-alertzero-worker-chain')?.serverConfigSet).toBe(
      WORKER_CHAIN_CONFIG_SET
    );
    expect(suiteEntry('security-attack-discovery-fp-tp')?.serverConfigSet).toBe(
      'evals_attack_discovery_fp_tp'
    );
  });

  it('ships that config set, enabling investigateRuleSkill', () => {
    const dir = join(
      REPO_ROOT,
      'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets',
      WORKER_CHAIN_CONFIG_SET,
      'stateful'
    );
    expect(existsSync(join(dir, 'classic.stateful.config.ts'))).toBe(true);
    expect(readFileSync(join(dir, 'classic.stateful.config.ts'), 'utf8')).toContain(
      "'investigateRuleSkill'"
    );
  });

  it('the registered spec preflights the skill and binds the candidate connector', () => {
    const spec = readFileSync(join(__dirname, '../evals/worker_chain.spec.ts'), 'utf8');
    expect(spec).toContain('await assertInvestigateRuleSkillRegistered(fetch)');
    expect(spec).toContain('bindWorkerChainInferenceFeatures(fetch, connector.id)');
    expect(spec).toContain('expectedConnectorId: candidateConnectorId');
  });
});
