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
 * Approximate test counts for shared runner functions that dynamically generate `it()` calls.
 * Files importing these runners show 0 inline `it(` but actually produce many tests at runtime.
 */
const DYNAMIC_RUNNER_WEIGHTS: Record<string, number> = {
  getArtifactMockedDataTests: 40,
  getArtifactTabsTests: 12,
  createRbacPoliciesExistSuite: 1,
  createRbacHostsExistSuite: 1,
  createRbacEmptyStateSuite: 1,
  createNavigationEssSuite: 4,
};

const FILTERED_RUNNER_WEIGHTS: Record<string, number> = {
  getArtifactMockedDataTests: 8,
};

/**
 * Estimate spec file weight for load-balanced ordering across parallel CI agents.
 * Weight = inline `it(` count + estimated dynamic tests from shared runners.
 */
const getSpecFileWeight = (filePath: string): number => {
  try {
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    const itMatches = content.match(/\bit\s*\(/g);
    const itSkipMatches = content.match(/\bit\.skip\s*\(/g);
    let testCount = (itMatches?.length ?? 0) + (itSkipMatches?.length ?? 0);

    const hasSiemVersionFilter = content.includes('siemVersionFilter');

    for (const [runner, weight] of Object.entries(DYNAMIC_RUNNER_WEIGHTS)) {
      const callPattern = `${runner}(`;
      const occurrences = content.split(callPattern).length - 1;
      if (occurrences > 0) {
        const effectiveWeight =
          hasSiemVersionFilter && runner in FILTERED_RUNNER_WEIGHTS
            ? FILTERED_RUNNER_WEIGHTS[runner]
            : weight;
        testCount += occurrences * effectiveWeight;
      }
    }

    return testCount;
  } catch {
    return 0;
  }
};

/**
 * Order spec file paths for load-balanced distribution across parallel CI jobs.
 * Sorts by estimated weight (test count) descending, with path as tiebreaker, so that
 * round-robin in retrieveIntegrations() assigns each agent a similar mix of heavy and light specs.
 */
export const orderSpecFilesForLoadBalance = (filePaths: string[]): string[] => {
  if (filePaths.length <= 1) return filePaths;
  const withWeight = filePaths.map((p) => ({ path: p, weight: getSpecFileWeight(p) }));
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
export const retrieveIntegrations = (integrationsPaths: string[]) => {
  const nonSkippedSpecs = integrationsPaths.filter((filePath) => !isSkipped(filePath));

  if (process.env.RUN_ALL_TESTS === 'true') {
    return nonSkippedSpecs;
  } else {
    // The number of instances of this job were created
    const chunksTotal: number = process.env.BUILDKITE_PARALLEL_JOB_COUNT
      ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
      : 1;
    // An index which uniquely identifies this instance of the job
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

export const isSkipped = (filePath: string): boolean => {
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
  return callExpression?.callee?.property?.name === 'skip';
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
