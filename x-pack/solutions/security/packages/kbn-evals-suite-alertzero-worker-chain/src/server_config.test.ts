/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');

const suiteEntry = (id: string) => {
  const { suites } = JSON.parse(
    readFileSync(join(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
  ) as { suites: Array<{ id: string; serverConfigSet?: string }> };
  return suites.find((suite) => suite.id === id);
};

describe('worker-chain server config', () => {
  it('shares the attack-discovery-fp-tp config set', () => {
    expect(suiteEntry('security-alertzero-worker-chain')?.serverConfigSet).toBe(
      'evals_attack_discovery_fp_tp'
    );
  });

  it('relies on investigateRuleSkill being on by default', () => {
    const features = readFileSync(
      join(
        REPO_ROOT,
        'x-pack/solutions/security/plugins/security_solution/common/experimental_features.ts'
      ),
      'utf8'
    );
    expect(features).toMatch(/\binvestigateRuleSkill: true,/);
  });

  it('the registered spec preflights the skill and binds the candidate connector', () => {
    const spec = readFileSync(join(__dirname, '../evals/worker_chain.spec.ts'), 'utf8');
    expect(spec).toContain('await assertInvestigateRuleSkillRegistered(fetch)');
    expect(spec).toContain('bindWorkerChainInferenceFeatures(fetch, connector.id)');
    expect(spec).toContain('expectedConnectorId: candidateConnectorId');
  });
});
