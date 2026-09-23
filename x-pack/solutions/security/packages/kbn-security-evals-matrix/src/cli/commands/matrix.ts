/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { resolveProfileEnvOverrides } from '@kbn/evals';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import {
  DEFAULT_EVALUATIONS_KBN_URL,
  MatrixEvalsClient,
  createEvaluationsKbnClient,
} from '../../matrix/matrix_evals_client';
import { loadMatrixConfig, applyModelOverrides } from '../../matrix/load_matrix_config';
import type { MatrixConfig } from '../../matrix/load_matrix_config';
import { queryMatrixScores } from '../../matrix/query_matrix_scores';
import type {
  QueryMatrixScoresOptions,
  ScoreAggregationOptions,
} from '../../matrix/query_matrix_scores';
import { buildMatrix } from '../../matrix/build_matrix';
import { renderMatrix } from '../../matrix/render_matrix';
import { renderMatrixHtml } from '../../matrix/render_matrix_html';
import { renderReliabilityHtml } from '../../matrix/render_reliability_html';
import { queryMatrixTraces } from '../../matrix/query_matrix_traces';
import type { MatrixTraceData } from '../../matrix/trace_types';
import type { JudgeVerdict } from '../../matrix/judge_agreement';
import { readLocalGitState } from '../../matrix/local_git_state';
import {
  warnOnConfiguredNamesMissingFromData,
  warnOnDataAboutToLeaveLookback,
} from '../../matrix/config_data_preflight';

/**
 * `KbnClient` accepts `https://user:pass@host` URLs, and the default itself
 * uses that form. Never log a Kibana URL verbatim — strip userinfo, query,
 * and fragment so credentials never land in local or CI logs.
 */
export const sanitizeKbnUrlForLog = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '<unparseable-url>';
  }
};

const DEFAULT_OUT_DIR = 'target/llm_matrix';

/** Builds the score aggregation query for a matrix run. */
export const matrixScoreQuery = (
  config: MatrixConfig,
  {
    suiteIds,
    modelIds,
    branch,
    lookbackDays,
    asOf,
  }: Omit<
    QueryMatrixScoresOptions,
    'prefixesBySuite' | 'scoring' | 'branchBySuite' | 'scoringBySuite' | 'asOf'
  > & {
    /** Required (though nullable) so a caller cannot silently drop it. */
    asOf: number | undefined;
  }
): QueryMatrixScoresOptions => ({
  suiteIds,
  modelIds,
  branch,
  branchBySuite: branchBySuiteFromColumns(config, branch),
  lookbackDays,
  asOf,
  prefixesBySuite: prefixesBySuiteFromColumns(config),
  scoring: config.scoring,
  scoringBySuite: scoringBySuiteFromColumns(config),
});

/** Collapses per-column `allowSelfJudged` into a suite-keyed scoring policy; throws when columns sharing a suite disagree. */
export const scoringBySuiteFromColumns = (
  config: MatrixConfig
): Record<string, ScoreAggregationOptions> => {
  const bySuite: Record<string, ScoreAggregationOptions> = {};
  // Absent config must not be stricter than an explicit `false`: only a resolved
  // `excludeSelfJudged === true` excludes self-judged runs.
  const globalExcludeSelfJudged = config.scoring?.excludeSelfJudged === true;
  // The policy is applied per suite at fetch time, so every column reading a suite must agree on
  // it. Compare each column's EFFECTIVE policy (its override, else the global default): a column
  // that omits `allowSelfJudged` still reads the suite under the global policy, so skipping it
  // would let an explicit override silently apply to a column that never agreed to it.
  const excludeBySuite = new Map<string, boolean>();
  for (const column of config.columns) {
    const exclude =
      column.allowSelfJudged === undefined ? globalExcludeSelfJudged : !column.allowSelfJudged;
    for (const suiteId of column.suites ?? []) {
      const existing = excludeBySuite.get(suiteId);
      if (existing !== undefined && existing !== exclude) {
        const source = (value: boolean): string =>
          value === globalExcludeSelfJudged ? 'inherited' : 'override';
        throw new Error(
          `Conflicting allowSelfJudged settings for suite "${suiteId}": one column resolves to ` +
            `allowSelfJudged=${!exclude} (${source(
              exclude
            )}) and another to allowSelfJudged=${!existing} (${source(existing)}). ` +
            `Scores are fetched per suite, so every column backed by this suite must agree on the self-judging policy.`
        );
      }
      excludeBySuite.set(suiteId, exclude);
      // Only materialize a suite override when this column actually sets one; columns inheriting
      // the global policy are already covered by `config.scoring`.
      if (column.allowSelfJudged !== undefined) {
        bySuite[suiteId] = { ...config.scoring, excludeSelfJudged: exclude };
      }
    }
  }
  return bySuite;
};

/** Collapses per-column `examplePrefixes` into a suite-keyed map. */
export const prefixesBySuiteFromColumns = (config: MatrixConfig): Record<string, string[]> => {
  const bySuite: Record<string, string[]> = {};

  for (const column of config.columns) {
    for (const suiteId of column.suites) {
      if (column.examplePrefixes?.length) {
        bySuite[suiteId] = [...new Set([...(bySuite[suiteId] ?? []), ...column.examplePrefixes])];
      }
    }
  }

  return bySuite;
};

/**
 * Collapses per-column `branch` overrides into a suite-keyed map; throws when columns sharing
 * a suite disagree on their *effective* branch (`column.branch ?? globalBranch`). A column that
 * omits `branch` still inherits the CLI's global branch, so it must be checked against another
 * column's explicit override for the same suite -- not skipped, or the suite silently reads
 * whichever override happened to be recorded first.
 */
export const branchBySuiteFromColumns = (
  config: MatrixConfig,
  globalBranch?: string
): Record<string, string | string[]> => {
  const bySuite: Record<string, string | string[]> = {};
  const describe = (branch: string | string[]): string =>
    Array.isArray(branch) ? branch.join(', ') : branch;

  for (const column of config.columns) {
    // A column with no override still queries `globalBranch`; only omit it from the map
    // when there's nothing to override with either, so callers fall back to their own default.
    const effective = column.branch ?? globalBranch;
    if (effective) {
      for (const suiteId of column.suites) {
        const existing = bySuite[suiteId];
        if (existing !== undefined && describe(existing) !== describe(effective)) {
          throw new Error(
            `Conflicting branch overrides for suite "${suiteId}": ` +
              `"${describe(existing)}" and "${describe(effective)}". A suite is queried ` +
              `once, so its columns must agree on which branch to read.`
          );
        }
        bySuite[suiteId] = effective;
      }
    }
  }
  return bySuite;
};

export const matrixCmd: Command<void> = {
  name: 'matrix',
  description: `
  Generate an LLM performance matrix artifact from exported evaluation results.

  Reads the latest experiment per (model, suite) from the evals plugin on the
  target Kibana, maps suites/datasets/evaluators onto matrix columns via a config
  file, normalizes scores onto a 0-10 scale, and writes markdown + CSV + JSON.

  Configure target/auth with EVAL_KBN_URL and EVAL_KBN_API_KEY,
  with --kbn-url/--kbn-api-key, or with --profile (e.g. dev-vault for the golden
  cluster, or a config.<name>.json file).

  Example:
    node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs matrix \\
      --config x-pack/solutions/security/packages/kbn-security-evals-matrix/config/security_matrix_persona.json \\
      --profile dev-vault --branch main --out target/llm_matrix
  `,
  flags: {
    string: [
      'config',
      'out',
      'branch',
      'lookback-days',
      'as-of',
      'profile',
      'kbn-url',
      'kbn-api-key',
      'model',
      'trace-cache',
    ],
    boolean: ['html'],
    allowUnexpected: false,
    help: `
    --config           Path to the matrix config JSON (required).
    --out              Output directory for artifacts (default: ${DEFAULT_OUT_DIR}).
    --branch           Git branch filter override (default: config.branch).
    --lookback-days    Only consider experiments newer than now-<n>d (default: config.lookbackDays).
    --as-of            Render the matrix as of an ISO date/instant, ignoring runs
                       after it for every model alike (e.g. 2026-09-01). Use to
                       reproduce an earlier matrix or exclude a known-bad window.
    --model            Replace the config's model set for an on-demand run.
                       Format: id[:label][:open-source]. Repeatable.
                       e.g. --model gpt-5-preview:GPT-5 --model qwen3:Qwen3:open-source
    --profile          Golden-cluster config profile providing EVAL_KBN_URL/API_KEY
                       (e.g. 'dev-vault' for runtime Vault, or a config.<name>.json file).
    --trace-cache      Path to a trace-cache JSON (executionId::exampleId -> score docs).
    --kbn-url          Kibana URL override.
    --kbn-api-key      Kibana API key override.
    --html             Also generate a self-contained HTML report (matrix.html).
    `,
  },
  run: async ({ log, flagsReader }) => {
    const configPath = flagsReader.string('config');
    if (!configPath) {
      throw createFlagError('--config is required. Provide the path to a matrix config JSON.');
    }

    const repoRoot = process.cwd();
    const baseConfig = loadMatrixConfig(Path.resolve(repoRoot, configPath));

    const modelOverrides = flagsReader.arrayOfStrings('model') ?? [];
    let config: MatrixConfig;
    try {
      config = applyModelOverrides(baseConfig, modelOverrides);
    } catch (error) {
      throw createFlagError(error instanceof Error ? error.message : String(error));
    }
    if (modelOverrides.length > 0) {
      log.info(
        `Overriding config model set with ${
          config.models.length
        } on-demand model(s): ${config.models.map((model) => model.id).join(', ')}`
      );
    }

    const profile = flagsReader.string('profile') ?? undefined;
    const { profileEnvOverrides: profileEnv } = await resolveProfileEnvOverrides({
      repoRoot,
      log,
      flagsReader,
      profile,
    });

    const evaluationsKbnUrl =
      flagsReader.string('kbn-url') ?? profileEnv.EVAL_KBN_URL ?? process.env.EVAL_KBN_URL;
    if (!evaluationsKbnUrl) {
      log.warning(`EVAL_KBN_URL not set; defaulting to ${DEFAULT_EVALUATIONS_KBN_URL}.`);
    }

    const evaluationsKbnApiKey =
      flagsReader.string('kbn-api-key') ??
      profileEnv.EVAL_KBN_API_KEY ??
      process.env.EVAL_KBN_API_KEY;

    const branch = flagsReader.string('branch') ?? config.branch;
    const lookbackDaysFlag = flagsReader.string('lookback-days');
    const lookbackDays = lookbackDaysFlag ? Number(lookbackDaysFlag) : config.lookbackDays;
    if (Number.isNaN(lookbackDays) || lookbackDays < 1) {
      throw createFlagError('--lookback-days must be a positive number.');
    }

    const asOfFlag = flagsReader.string('as-of');
    const asOf = asOfFlag === undefined ? undefined : Date.parse(asOfFlag);
    if (asOf !== undefined && !Number.isFinite(asOf)) {
      throw createFlagError('--as-of must be an ISO date or instant, e.g. 2026-09-01.');
    }

    const outDir = Path.resolve(repoRoot, flagsReader.string('out') ?? DEFAULT_OUT_DIR);
    const suiteIds = [...new Set(config.columns.flatMap((column) => column.suites))];
    // Include matchIds so aliased model rows are found.
    const modelIds = [
      ...new Set(config.models.flatMap((model) => [model.id, ...(model.matchIds ?? [])])),
    ];

    const kbnClient = createEvaluationsKbnClient({
      log,
      url: evaluationsKbnUrl,
      apiKey: evaluationsKbnApiKey,
    });
    const evalsClient = new MatrixEvalsClient(kbnClient, log);

    try {
      await evalsClient.assertPluginEnabled();
    } catch (error) {
      throw createFlagError(
        [
          error instanceof Error ? error.message : String(error),
          'Set EVAL_KBN_URL to a Kibana instance with xpack.evals.enabled=true.',
          'Set EVAL_KBN_API_KEY when authenticating to a non-local target.',
        ].join('\n')
      );
    }

    log.info(
      `Querying matrix scores from ${sanitizeKbnUrlForLog(
        evaluationsKbnUrl ?? DEFAULT_EVALUATIONS_KBN_URL
      )} (branch: ${branch ?? 'any'})`
    );

    const matrixQuery = matrixScoreQuery(config, {
      suiteIds,
      modelIds,
      branch,
      lookbackDays,
      asOf,
    });
    const aggregated = await queryMatrixScores(evalsClient, log, matrixQuery);

    if (aggregated.length === 0) {
      throw createFailError(
        [
          'No experiments matched the configured filters, refusing to write an empty matrix.',
          `Filters: suites=[${suiteIds.join(', ')}] models=[${modelIds.join(', ')}] branch=${
            branch ?? 'any'
          } lookbackDays=${lookbackDays}`,
          'Check that the weekly eval run published results for these suites in the lookback window.',
        ].join('\n')
      );
    }

    warnOnConfiguredNamesMissingFromData(config, aggregated, log);
    warnOnDataAboutToLeaveLookback(config, aggregated, log, {
      ...(asOf !== undefined ? { now: asOf } : {}),
      lookbackDays,
    });

    const matrix = buildMatrix(aggregated, config, log);
    const generateHtml = flagsReader.boolean('html');

    // Traces are queried before rendering so they can be embedded in matrix.json.
    let traces: MatrixTraceData | undefined;
    const judgeVerdicts: JudgeVerdict[] = [];
    const traceCacheForProvenance = flagsReader.string('trace-cache') ?? 'none';
    const localGit = readLocalGitState(repoRoot, log);
    if (generateHtml) {
      log.info('Querying trace data for HTML report...');
      // Pre-pulled score documents keyed `${executionId}::${exampleId}`; cached cells skip the server fetch.
      const traceCachePath = flagsReader.string('trace-cache');
      let traceCache: Record<string, EvaluationScoreDocument[]> | undefined;
      if (traceCachePath) {
        traceCache = JSON.parse(Fs.readFileSync(traceCachePath, 'utf8')) as Record<
          string,
          EvaluationScoreDocument[]
        >;
        log.info(
          `Loaded trace cache: ${Object.keys(traceCache).length} cells from ${traceCachePath}`
        );
      }
      traces = await queryMatrixTraces(
        evalsClient,
        log,
        aggregated,
        traceCache,
        config.toolCallWarnAbove,
        new Map(
          config.models
            .filter((model) => (model.matchIds ?? []).length > 0)
            .map((model) => [model.id, model.matchIds ?? []])
        ),
        judgeVerdicts,
        matrixQuery.scoringBySuite,
        // Effective global policy: inherited suites have no per-suite override, and
        // the trace path must reject the same documents the score query rejected.
        config.scoring
      );

      // Server-fetched traces can come back without steps, so count only the ones that carry steps.
      const traceCells = Object.values(traces ?? {});
      const withSteps = traceCells.filter((t) => (t?.stepCount ?? 0) > 0).length;
      if (traceCells.length === 0) {
        log.warning('no traces resolved -- the report will have no trace panels');
      } else if (withSteps === 0) {
        log.warning(
          `all ${traceCells.length} traces came back without steps${
            traceCachePath
              ? ''
              : ' -- pass --trace-cache to load step payloads from a pre-pulled cache'
          }`
        );
      }
    }

    // The suite->branch map actually used by the query; a mixed-branch matrix must
    // disclose which suites were read from which branch in every artifact.
    const branchBySuite = branchBySuiteFromColumns(config, branch);
    const rendered = renderMatrix(
      matrix,
      config,
      {
        branch,
        ...(Object.keys(branchBySuite).length > 0 ? { branchBySuite } : {}),
        lookbackDays,
        asOf,
        suiteIds,
        commitSha: process.env.BUILDKITE_COMMIT ?? localGit.sha,
        dirtyWorkingTree: localGit.dirty,
        traceCache: traceCacheForProvenance,
        buildUrl: process.env.BUILDKITE_BUILD_URL,
      },
      traces
    );

    Fs.mkdirSync(outDir, { recursive: true });
    const writes: Array<[string, string]> = [
      ['proprietary-models.csv', rendered.proprietaryCsv],
      ['open-source-models.csv', rendered.openSourceCsv],
      ['matrix.md', rendered.markdown],
      ['matrix.json', rendered.json],
      // Raw pre-scaling per-evaluator means/counts for auditing.
      ['scores.debug.json', `${JSON.stringify(aggregated, null, 2)}\n`],
    ];
    for (const [fileName, contents] of writes) {
      Fs.writeFileSync(Path.join(outDir, fileName), contents);
    }

    if (generateHtml && traces) {
      const htmlContent = renderMatrixHtml(
        matrix,
        config,
        {
          branch,
          ...(Object.keys(branchBySuite).length > 0 ? { branchBySuite } : {}),
          lookbackDays,
          asOf,
          suiteIds,
          commitSha: process.env.BUILDKITE_COMMIT ?? localGit.sha,
          dirtyWorkingTree: localGit.dirty,
          traceCache: traceCacheForProvenance,
          buildUrl: process.env.BUILDKITE_BUILD_URL,
          fixtureFingerprint: config.provenance?.fixtureFingerprint,
          methodologyNotes: config.provenance?.methodologyNotes,
        },
        traces
      );
      Fs.writeFileSync(Path.join(outDir, 'matrix.html'), htmlContent);
      const reliabilityHtml = renderReliabilityHtml(
        matrix,
        traces,
        {
          branch,
          ...(Object.keys(branchBySuite).length > 0 ? { branchBySuite } : {}),
          lookbackDays,
          asOf,
          commitSha: process.env.BUILDKITE_COMMIT ?? localGit.sha,
          dirtyWorkingTree: localGit.dirty,
        },
        judgeVerdicts
      );
      Fs.writeFileSync(Path.join(outDir, 'matrix.reliability.html'), reliabilityHtml);
      log.info(`Wrote matrix.html and matrix.reliability.html to ${outDir}`);
    }

    log.info(
      `Wrote matrix artifacts to ${outDir} ` +
        `(${matrix.proprietary.length} proprietary, ${matrix.openSource.length} open-source models)`
    );
    log.info(`\n${rendered.markdown}`);
  },
};
