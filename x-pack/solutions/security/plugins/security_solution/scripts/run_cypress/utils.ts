/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import * as fs from 'fs';
import * as parser from '@babel/parser';
import generate from '@babel/generator';
import type { ExpressionStatement, ObjectExpression, ObjectProperty } from '@babel/types';
import { schema, type TypeOf } from '@kbn/config-schema';
import chalk from 'chalk';
import type { ToolingLogTextWriterConfig } from '@kbn/tooling-log';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';

/**
 * Configuration for the config-aware load balancer.
 * Suite-specific values (e.g. Defend Workflows) live in separate config files
 * so that utils.ts stays generic and reusable by other Cypress suites.
 */
export interface LoadBalancerConfig {
  /** Maps dynamic runner function names to their approximate test counts. */
  dynamicRunnerWeights: Record<string, number>;
  /** Reduced weights when a spec filters by a single SIEM version. */
  filteredRunnerWeights: Record<string, number>;
  /** Weight penalty for each distinct ftrConfig on an agent (~stack setup cost). */
  setupCostWeight: number;
  /** Per-spec overhead in weight units (Cypress boot, browser init). */
  perSpecOverhead: number;
  /** Minimum weight floor for any spec file. */
  minSpecWeight: number;
  /**
   * Override weights for specs where test count doesn't reflect actual runtime.
   * Keys are path fragments matched against the full file path (e.g. `tamper_protection/`
   * or `endpoint_operations.cy.ts`). The first matching entry wins.
   */
  specWeightOverrides?: Array<{ pattern: string; weight: number }>;
}

const DEFAULT_MIN_SPEC_WEIGHT = 1;

/**
 * Estimate spec file weight for load-balanced ordering across parallel CI agents.
 * When a LoadBalancerConfig is provided, dynamic runner weights and minimum floor
 * are applied. Without config, falls back to counting inline `it()` calls only.
 */
const getSpecFileWeight = (filePath: string, lbConfig?: LoadBalancerConfig): number => {
  const minWeight = lbConfig?.minSpecWeight ?? DEFAULT_MIN_SPEC_WEIGHT;

  if (lbConfig?.specWeightOverrides) {
    const override = lbConfig.specWeightOverrides.find(({ pattern }) => filePath.includes(pattern));
    if (override) {
      return Math.max(override.weight, minWeight);
    }
  }

  try {
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    const itMatches = content.match(/\bit\s*\(/g);
    const itSkipMatches = content.match(/\bit\.skip\s*\(/g);
    let testCount = (itMatches?.length ?? 0) + (itSkipMatches?.length ?? 0);

    if (lbConfig) {
      const hasSiemVersionFilter = content.includes('siemVersionFilter');

      for (const [runner, weight] of Object.entries(lbConfig.dynamicRunnerWeights)) {
        const callPattern = `${runner}(`;
        const occurrences = content.split(callPattern).length - 1;
        if (occurrences > 0) {
          const effectiveWeight =
            hasSiemVersionFilter && runner in lbConfig.filteredRunnerWeights
              ? lbConfig.filteredRunnerWeights[runner]
              : weight;
          testCount += occurrences * effectiveWeight;
        }
      }
    }

    return Math.max(testCount, minWeight);
  } catch {
    return minWeight;
  }
};

/**
 * Order spec file paths for load-balanced distribution across parallel CI jobs.
 * Sorts by estimated weight (test count) descending, with path as tiebreaker, so that
 * round-robin in retrieveIntegrations() assigns each agent a similar mix of heavy and light specs.
 */
export const orderSpecFilesForLoadBalance = (
  filePaths: string[],
  lbConfig?: LoadBalancerConfig
): string[] => {
  if (filePaths.length <= 1) return filePaths;
  const withWeight = filePaths.map((p) => ({ path: p, weight: getSpecFileWeight(p, lbConfig) }));
  withWeight.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.path.localeCompare(b.path);
  });
  return withWeight.map(({ path }) => path);
};

/**
 * Retrieve test files using a glob pattern.
 * If process.env.RUN_ALL_TESTS is true, returns all matching files, otherwise, return files that should be run by this job based on process.env.BUILDKITE_PARALLEL_JOB_COUNT and process.env.BUILDKITE_PARALLEL_JOB
 */
export const retrieveIntegrations = (
  integrationsPaths: string[],
  lbConfig?: LoadBalancerConfig
) => {
  const nonSkippedSpecs = integrationsPaths.filter((filePath) => !isSkipped(filePath, lbConfig));

  if (process.env.RUN_ALL_TESTS === 'true') {
    return nonSkippedSpecs;
  } else {
    const chunksTotal: number = process.env.BUILDKITE_PARALLEL_JOB_COUNT
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
      : 1;
    const chunkIndex: number = process.env.BUILDKITE_PARALLEL_JOB
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10)
      : 0;

    const nonSkippedSpecsForChunk: string[] = [];

    for (let i = chunkIndex; i < nonSkippedSpecs.length; i += chunksTotal) {
      nonSkippedSpecsForChunk.push(nonSkippedSpecs[i]);
    }

    return nonSkippedSpecsForChunk;
  }
};

/**
 * Config-aware spec distribution for parallel CI agents.
 * Instead of naive round-robin, this uses greedy bin-packing that accounts for
 * ftrConfig setup cost: assigning a spec to an agent that already has its config
 * avoids an extra ~4 min stack setup. This keeps specs with the same ftrConfig
 * together on the same agents whenever possible, dramatically reducing total
 * setup time when CYPRESS_SHARE_STACKS is enabled.
 */
export const retrieveIntegrationsConfigAware = (
  integrationsPaths: string[],
  lbConfig: LoadBalancerConfig
): string[] => {
  const nonSkippedSpecs = integrationsPaths.filter((filePath) => !isSkipped(filePath, lbConfig));

  if (process.env.RUN_ALL_TESTS === 'true') {
    return nonSkippedSpecs;
  }

  const chunksTotal: number = process.env.BUILDKITE_PARALLEL_JOB_COUNT
    ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
    : 1;
  const chunkIndex: number = process.env.BUILDKITE_PARALLEL_JOB
    ? parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10)
    : 0;

  if (chunksTotal <= 1) {
    return nonSkippedSpecs;
  }

  const specs = nonSkippedSpecs.map((filePath) => ({
    path: filePath,
    weight: getSpecFileWeight(filePath, lbConfig),
    configKey: ftrConfigToKey(parseTestFileConfig(filePath)),
  }));

  specs.sort((a, b) => b.weight - a.weight || a.path.localeCompare(b.path));

  const agents: Array<{
    paths: string[];
    totalWeight: number;
    configs: Set<string>;
  }> = Array.from({ length: chunksTotal }, () => ({
    paths: [],
    totalWeight: 0,
    configs: new Set<string>(),
  }));

  const getAgentCost = (agent: (typeof agents)[number], specConfigKey: string): number => {
    const newConfigPenalty = agent.configs.has(specConfigKey) ? 0 : lbConfig.setupCostWeight;
    return (
      agent.totalWeight +
      agent.paths.length * lbConfig.perSpecOverhead +
      agent.configs.size * lbConfig.setupCostWeight +
      newConfigPenalty
    );
  };

  for (const spec of specs) {
    let bestIdx = 0;
    let bestCost = Infinity;

    for (let i = 0; i < agents.length; i++) {
      const cost = getAgentCost(agents[i], spec.configKey);
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }

    agents[bestIdx].paths.push(spec.path);
    agents[bestIdx].totalWeight += spec.weight;
    agents[bestIdx].configs.add(spec.configKey);
  }

  return agents[chunkIndex].paths;
};

export const isSkipped = (filePath: string, lbConfig?: LoadBalancerConfig): boolean => {
  const testFile = fs.readFileSync(filePath, { encoding: 'utf8' });

  const ast = parser.parse(testFile, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  const expressionStatement = _.find(ast.program.body, ['type', 'ExpressionStatement']) as
    | ExpressionStatement
    | undefined;

  const callExpression = expressionStatement?.expression;

  // @ts-expect-error
  if (callExpression?.callee?.property?.name === 'skip') {
    return true;
  }

  const dynamicRunnerNames = lbConfig
    ? new Set(Object.keys(lbConfig.dynamicRunnerWeights))
    : undefined;

  return hasAllTestsSkipped(ast, dynamicRunnerNames);
};

/**
 * Walk the AST to check if every test source is either:
 * - an `it.skip(...)` call,
 * - an `it()` / dynamic runner call inside a `describe.skip(...)` block, or
 * - absent entirely (no `it()` or dynamic runner calls at all).
 * Returns true when the file would produce zero running tests.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasAllTestsSkipped = (ast: any, dynamicRunnerNames?: Set<string>): boolean => {
  let totalRunnable = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: any, insideSkip: boolean): void => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'CallExpression') {
      const callee = node.callee;

      const isDescribeSkip =
        callee?.type === 'MemberExpression' &&
        callee?.object?.name === 'describe' &&
        callee?.property?.name === 'skip';

      const isItCall = callee?.name === 'it';
      const isItSkip =
        callee?.type === 'MemberExpression' &&
        callee?.object?.name === 'it' &&
        callee?.property?.name === 'skip';
      const isDynamicRunner =
        dynamicRunnerNames && callee?.name && dynamicRunnerNames.has(callee.name);

      if ((isItCall || isDynamicRunner) && !insideSkip) {
        totalRunnable++;
      }

      if (isItSkip) {
        // it.skip is always skipped regardless of parent context
      } else if (isDescribeSkip) {
        for (const arg of node.arguments ?? []) {
          walk(arg, true);
        }
        return;
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') {
        // Skip metadata keys that don't contain child AST nodes
      } else {
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) walk(item, insideSkip);
        } else if (child && typeof child === 'object' && child.type) {
          walk(child, insideSkip);
        }
      }
    }
  };

  walk(ast, false);
  return totalRunnable === 0;
};

export const parseTestFileConfig = (filePath: string): SecuritySolutionDescribeBlockFtrConfig => {
  const testFile = fs.readFileSync(filePath, { encoding: 'utf8' });

  const ast = parser.parse(testFile, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  const expressionStatement = _.find(ast.program.body, {
    type: 'ExpressionStatement',
    expression: { callee: { name: 'describe' } },
  }) as ExpressionStatement | undefined;

  const callExpression = expressionStatement?.expression;
  // @ts-expect-error
  if (expressionStatement?.expression?.arguments?.length === 3) {
    // @ts-expect-error
    const callExpressionArguments = _.find(callExpression?.arguments, [
      'type',
      'ObjectExpression',
    ]) as ObjectExpression | undefined;

    const callExpressionProperties = _.find(callExpressionArguments?.properties, [
      'key.name',
      'env',
    ]) as ObjectProperty[] | undefined;
    // @ts-expect-error
    const ftrConfig = _.find(callExpressionProperties?.value?.properties, [
      'key.name',
      'ftrConfig',
    ]);

    if (!ftrConfig) {
      return {};
    }

    const ftrConfigCode = generate(ftrConfig.value, { jsonCompatibleStrings: true }).code;

    try {
      // TODO:PT need to assess implication of using this approach to get the JSON back out
      // eslint-disable-next-line no-new-func
      const ftrConfigJson = new Function(`return ${ftrConfigCode}`)();
      return TestFileFtrConfigSchema.validate(ftrConfigJson);
    } catch (err) {
      throw new Error(
        `Failed to parse 'ftrConfig' value defined in 'describe()' at ${filePath}. ${err.message}\nCode: ${ftrConfigCode}`
      );
    }
  }

  return {};
};

const TestFileFtrConfigSchema = schema.object(
  {
    license: schema.maybe(schema.string()),
    kbnServerArgs: schema.maybe(schema.arrayOf(schema.string())),
    productTypes: schema.maybe(
      // TODO:PT write validate function to ensure that only the correct combinations are used
      schema.arrayOf(
        schema.object({
          product_line: schema.oneOf([
            schema.literal('security'),
            schema.literal('endpoint'),
            schema.literal('cloud'),
          ]),

          product_tier: schema.oneOf([schema.literal('essentials'), schema.literal('complete')]),
        })
      )
    ),
  },
  { defaultValue: {}, unknowns: 'forbid' }
);

export type SecuritySolutionDescribeBlockFtrConfig = TypeOf<typeof TestFileFtrConfigSchema>;

/**
 * Serialize an ftrConfig to a stable string key for grouping specs that can share a stack.
 * Specs with identical keys need the same ES license, Kibana args, and product types,
 * so they can run sequentially against a single ES/Kibana/Fleet instance.
 */
const ftrConfigToKey = (config: SecuritySolutionDescribeBlockFtrConfig): string => {
  const normalized = {
    license: config.license ?? '',
    kbnServerArgs: [...(config.kbnServerArgs ?? [])].sort(),
    productTypes: [...(config.productTypes ?? [])].sort((a, b) =>
      `${a.product_line}:${a.product_tier}`.localeCompare(`${b.product_line}:${b.product_tier}`)
    ),
  };
  return JSON.stringify(normalized);
};

export interface SpecGroup {
  configKey: string;
  ftrConfig: SecuritySolutionDescribeBlockFtrConfig;
  specFilePaths: string[];
}

/**
 * Group spec file paths by their parsed ftrConfig so that specs sharing the
 * same stack configuration can be run against a single ES/Kibana instance.
 * Order within each group is preserved from the input array.
 */
export const groupSpecsByFtrConfig = (filePaths: string[]): SpecGroup[] => {
  const groupMap = new Map<string, SpecGroup>();
  const groupOrder: string[] = [];

  for (const filePath of filePaths) {
    const config = parseTestFileConfig(filePath);
    const key = ftrConfigToKey(config);

    const existing = groupMap.get(key);
    if (existing) {
      existing.specFilePaths.push(filePath);
    } else {
      groupMap.set(key, { configKey: key, ftrConfig: config, specFilePaths: [filePath] });
      groupOrder.push(key);
    }
  }

  return groupOrder.reduce<SpecGroup[]>((acc, key) => {
    const group = groupMap.get(key);
    if (group) {
      acc.push(group);
    }
    return acc;
  }, []);
};

export const getOnBeforeHook = (module: unknown, beforeSpecFilePath: string): Function => {
  if (typeof module !== 'object' || module === null) {
    throw new Error(
      `${chalk.bold(
        beforeSpecFilePath
      )} expected to explicitly export function member named "onBeforeHook"`
    );
  }

  if (!('onBeforeHook' in module) || typeof module.onBeforeHook !== 'function') {
    throw new Error(
      `${chalk.bold('onBeforeHook')} exported from ${chalk.bold(
        beforeSpecFilePath
      )} is not a function`
    );
  }

  return module.onBeforeHook;
};

/**
 * Sets the default log level for `ToolingLog` instances created by `createToolingLogger()`:
 * `x-pack/solutions/security/plugins/security_solution/common/endpoint/data_loaders/utils.ts:148`.
 * It will first check the NodeJs `process.env` to see if an Environment Variable was set
 * and then, if provided, it will use the value defined in the Cypress Config. file.
 */
export const setDefaultToolingLoggingLevel = (defaultFallbackLoggingLevel?: string) => {
  const logLevel =
    process.env.TOOLING_LOG_LEVEL ||
    process.env.CYPRESS_TOOLING_LOG_LEVEL ||
    defaultFallbackLoggingLevel ||
    '';

  if (logLevel) {
    createToolingLogger('info').info(`Setting tooling log level to [${logLevel}]`);
    createToolingLogger.defaultLogLevel = logLevel as ToolingLogTextWriterConfig['level'];
  }
};
