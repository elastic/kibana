/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  configureOsqueryTrapStatePath,
  readOsqueryTrapState,
  writeOsqueryTrapState,
} from './data_generators/osquery_trap_state';

const read = (relativePath: string) => Fs.readFileSync(Path.join(REPO_ROOT, relativePath), 'utf8');

describe('Endpoint Osquery eval isolation', () => {
  it('keeps osquery_manager out of the base endpoint Scout config', () => {
    const baseConfig = read(
      'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_endpoint/stateful/classic.stateful.config.ts'
    );

    // Assert on the actual server arguments; the file's prose intentionally
    // explains why Osquery is excluded.
    const serverArgs = baseConfig.slice(baseConfig.indexOf('serverArgs: ['));

    expect(baseConfig).toContain('--xpack.fleet.packages.0.name=endpoint');
    expect(serverArgs).not.toContain('osquery_manager');
    // Tools register without the integration so capability detection is testable.
    expect(serverArgs).toContain('--xpack.osquery.enableExperimental=["agentBuilderTools"]');
  });

  it('installs osquery_manager only in the endpoint-osquery Scout config', () => {
    const osqueryConfig = read(
      'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_endpoint_osquery/stateful/classic.stateful.config.ts'
    );

    expect(osqueryConfig).toContain('../../evals_endpoint/stateful/classic.stateful.config');
    expect(osqueryConfig).toContain('--xpack.fleet.packages.1.name=osquery_manager');
    expect(osqueryConfig).not.toContain('--xpack.osquery.enableExperimental');
  });

  it('registers a separate endpoint-osquery suite so unrelated endpoint evals do not inherit Osquery', () => {
    const suites = JSON.parse(read('.buildkite/pipelines/evals/evals.suites.json')) as {
      suites: Array<{ id: string; configPath: string; serverConfigSet: string }>;
    };

    const endpoint = suites.suites.find((suite) => suite.id === 'endpoint');
    const endpointOsquery = suites.suites.find((suite) => suite.id === 'endpoint-osquery');
    const endpointOsqueryTrap = suites.suites.find((suite) => suite.id === 'endpoint-osquery-trap');

    expect(endpoint).toMatchObject({
      configPath:
        'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.config.ts',
      serverConfigSet: 'evals_endpoint',
    });
    expect(endpointOsquery).toMatchObject({
      configPath:
        'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.osquery.config.ts',
      serverConfigSet: 'evals_endpoint_osquery',
    });
    // The trap installs osquery_manager at runtime, so it gets its own suite
    // and stack — a shared stack leaks the install into other specs.
    expect(endpointOsqueryTrap).toMatchObject({
      configPath:
        'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.osquery_trap.config.ts',
      serverConfigSet: 'evals_endpoint',
    });
  });

  it('keeps the trap and live-state Osquery specs out of the base endpoint Playwright testDir', () => {
    const baseConfig = read(
      'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.config.ts'
    );
    const osqueryConfig = read(
      'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.osquery.config.ts'
    );
    const trapConfig = read(
      'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.osquery_trap.config.ts'
    );

    expect(baseConfig).toContain('testDir: `${__dirname}/evals`');
    expect(osqueryConfig).toContain('testDir: `${__dirname}/evals_osquery`');
    expect(trapConfig).toContain("testDir: Path.resolve(__dirname, './evals_trap')");
    expect(
      Fs.existsSync(
        Path.join(
          REPO_ROOT,
          'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals_osquery/endpoint_forensic_analysis/endpoint_forensic_analysis_osquery_live_state.spec.ts'
        )
      )
    ).toBe(true);
    expect(
      Fs.existsSync(
        Path.join(
          REPO_ROOT,
          'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals_trap/endpoint_forensic_analysis/endpoint_forensic_analysis_osquery_trap.spec.ts'
        )
      )
    ).toBe(true);
  });

  it('wires setup and teardown projects around every trap model project', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@kbn/evals', () => ({
        createPlaywrightEvalsConfig: () => ({ projects: [{ name: 'model', use: {} }] }),
      }));
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        OSQUERY_TRAP_RUN_ID: 'wiring-test',
      };
      delete env.OSQUERY_TRAP_STATE_PATH;
      const replacedEnv = jest.replaceProperty(process, 'env', env);
      try {
        const config = await import('../playwright.osquery_trap.config');
        expect(config.default.projects).toEqual([
          expect.objectContaining({
            name: 'trap-setup',
            testMatch: /global.setup\.ts/,
            teardown: 'trap-teardown',
          }),
          expect.objectContaining({ name: 'trap-teardown', testMatch: /global.teardown\.ts/ }),
          expect.objectContaining({ name: 'model', dependencies: ['trap-setup'] }),
        ]);
      } finally {
        replacedEnv.restore();
      }
    });
  });

  it('defaults trap state outside the checkout and rejects checkout-local state', () => {
    const env: NodeJS.ProcessEnv = { OSQUERY_TRAP_RUN_ID: 'state-test' };
    const statePath = configureOsqueryTrapStatePath(env);
    expect(Path.isAbsolute(statePath)).toBe(true);
    expect(Path.relative(REPO_ROOT, statePath).startsWith('..')).toBe(true);
    expect(env.OSQUERY_TRAP_STATE_PATH).toBe(statePath);

    expect(() =>
      configureOsqueryTrapStatePath({
        OSQUERY_TRAP_RUN_ID: 'state-test',
        OSQUERY_TRAP_STATE_PATH: Path.join(REPO_ROOT, 'trap-state.json'),
      })
    ).toThrow(/outside the checkout/);
  });

  it('round-trips trap cleanup resources through the external state file', async () => {
    const statePath = configureOsqueryTrapStatePath({ OSQUERY_TRAP_RUN_ID: `state-${Date.now()}` });
    const resources = {
      agentPolicyId: 'agent-policy',
      packagePolicyId: 'package-policy',
      packageInstalledByTrap: true,
    };

    try {
      await writeOsqueryTrapState(statePath, resources);
      expect(await readOsqueryTrapState(statePath)).toEqual(resources);
    } finally {
      Fs.rmSync(statePath, { force: true });
    }
  });

  it('keeps the no-Osquery fallback golden in the base endpoint suite', () => {
    const baseSmoke = read(
      'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/endpoint_forensic_analysis/endpoint_forensic_analysis_smoke.spec.ts'
    );
    const osqueryLiveState = read(
      'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals_osquery/endpoint_forensic_analysis/endpoint_forensic_analysis_osquery_live_state.spec.ts'
    );

    expect(baseSmoke).toContain('ef-016-capability-no-osquery-fallback');
    expect(osqueryLiveState).not.toContain('ef-016-capability-no-osquery-fallback');
  });

  it('requires agent resolution in every live-query golden path', () => {
    const spec = read(
      'x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals_osquery/endpoint_forensic_analysis/endpoint_forensic_analysis_osquery_live_state.spec.ts'
    );
    const sequences = [...spec.matchAll(/tool_sequence: \[([\s\S]*?)\]/g)].map((match) => match[1]);
    const liveQuerySequences = sequences.filter((sequence) =>
      sequence.includes('OSQUERY_RUN_LIVE_QUERY')
    );

    expect(liveQuerySequences.length).toBeGreaterThan(0);
    for (const sequence of liveQuerySequences) {
      expect(sequence).toContain('OSQUERY_RESOLVE_AGENT_IDS');
      expect(sequence.indexOf('OSQUERY_RESOLVE_AGENT_IDS')).toBeLessThan(
        sequence.indexOf('OSQUERY_RUN_LIVE_QUERY')
      );
      // `run_live_query` polls inline and returns rows when agents answer in
      // time, so `get_live_query_results` is a conditional follow-up. Requiring
      // it in the golden path would cap the score of a valid completed result.
      expect(sequence).not.toContain('OSQUERY_GET_LIVE_QUERY_RESULTS');
    }
  });
});
