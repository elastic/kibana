/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yamlLib from 'yaml';

import { WorkflowTemplatingEngine } from '@kbn/workflows-execution-engine/server/templating_engine';

// Load watch worker YAMLs directly from disk (Jest imports .yaml as raw string, not parsed).
const YAML_DIR = path.resolve(
  __dirname,
  '../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);
const loadYaml = (name: string) =>
  yamlLib.parse(fs.readFileSync(path.join(YAML_DIR, name), 'utf8')) as any;

/**
 * Every domain worker that authors a `watch_policy` skill_allowlist and threads it into its
 * `ai.agent` step's `configuration_overrides.skill_ids` (CWL skill-customization, Option 2 —
 * WG decision 2026-07-23, Slack C0BHGGA6PHC/p1784742716537469). Unblocked by
 * elastic/kibana#280617 (chrisbmar review: skill_ids override is a straight replace, not an
 * intersection — see run_agent.test.ts's "skill_ids override (straight replace, no
 * intersection)" suite for the platform-side contract).
 */
const WORKER_YAML_FILES = [
  'watch_dark_worker.yaml',
  'watch_deep_worker.yaml',
  'watch_floor_worker.yaml',
  'watch_detection_rule_creation_worker.yaml',
  'watch_detection_rule_tuning_worker.yaml',
  'watch_ad_continuation_worker.yaml',
] as const;

describe('watch worker skill_ids override rendering', () => {
  const engine = new WorkflowTemplatingEngine();

  it.each(WORKER_YAML_FILES)(
    '%s: watch_policy.skill_allowlist renders as a real array (not a stringified JSON blob) ' +
      "into the ai.agent step's configuration_overrides.skill_ids",
    (fileName) => {
      const doc = loadYaml(fileName);
      const watchPolicyStep = (doc.steps as any[]).find(
        (step: any) => step.name === 'watch_policy'
      );
      const agentStep = (doc.steps as any[]).find((step: any) => step.type === 'ai.agent');

      expect(watchPolicyStep).toBeDefined();
      expect(agentStep).toBeDefined();
      expect(Array.isArray(watchPolicyStep.with.watch.skill_allowlist)).toBe(true);
      expect(watchPolicyStep.with.watch.skill_allowlist.length).toBeGreaterThan(0);

      // The template must use `${{ ... }}` (dollar-prefixed) to preserve the array's object
      // type through rendering. A bare `{{ ... }}` (or a trailing `| json` filter, which only
      // makes sense for the opposite direction — parsing a JSON *string* into an object) both
      // stringify the value, which then fails InputSchema's `z.array(z.string())` check for
      // skill_ids at workflow-execution time.
      expect(agentStep.with.configuration_overrides.skill_ids).toMatch(/^\$\{\{.*\}\}$/);

      // A workflow step's `data.set` output surfaces as `steps.<name>.output.<key>` at
      // render time — reproduce that shape here rather than the step's raw `with` object.
      const renderContext = {
        steps: {
          watch_policy: { output: watchPolicyStep.with },
        },
      };

      const rendered = engine.render(agentStep.with, renderContext);

      expect(Array.isArray(rendered.configuration_overrides.skill_ids)).toBe(true);
      expect(rendered.configuration_overrides.skill_ids).toEqual(
        watchPolicyStep.with.watch.skill_allowlist
      );
      // Every rendered skill_ids entry must be a string, matching the platform's
      // `z.array(z.string().max(100))` schema for configuration_overrides.skill_ids
      // (x-pack/platform/plugins/shared/agent_builder/common/step_types/run_agent_step.ts).
      // Not re-importing that schema here directly to avoid a cross-plugin tsconfig
      // dependency from pnd -> agent_builder's plugin-private common/ (only the
      // @kbn/agent-builder-common *package* is a declared pnd reference, and this
      // schema is not re-exported through it).
      for (const skillId of rendered.configuration_overrides.skill_ids) {
        expect(typeof skillId).toBe('string');
      }
    }
  );
});
