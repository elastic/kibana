/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import type { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { createEsClient, createKbnClient } from '../lib/clients';
import { formatError, getStatusCode } from '../lib/type_guards';
import { LOAD_TEST_TAG, loadTestRunTag } from './lib/alert_clone';
import { startCollector } from './lib/collector';
import type { LoadTestConfig } from './lib/config';
import { ALERT_TRIAGE_WORKER_ID, alertsIndexFor, buildConfig, withRunTarget } from './lib/config';
import { executePlan } from './lib/dispatcher';
import {
  cancelExecution,
  getAnalysisRuntimeConfig,
  getTaskManagerHealth,
  getWorker,
  getWorkflow,
  listStepExecutions,
} from './lib/kibana_api';
import { buildBurstPlan, buildSustainedPlan } from './lib/plan';
import {
  TERMINAL_STATUSES,
  REPORTED_STEP_IDS,
  classifyDispatches,
  fetchProgress,
} from './lib/progress';
import { buildReport, distribution, renderReportMarkdown } from './lib/report';
import type { RunManifest, RunPaths } from './lib/run_store';
import {
  appendNdjson,
  assertRunIsNew,
  buildRunPaths,
  createRunManifest,
  readDispatches,
  readJson,
  readSamples,
  writeJson,
} from './lib/run_store';
import { loadTemplatePool } from './lib/templates';
import type { LoadPlan, DispatchRecord } from './lib/types';
import { fetchVerdicts } from './lib/verdicts';

const generateRunId = (): string =>
  new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .toLowerCase();

const gitInfo = (): { gitSha?: string; gitBranch?: string } => {
  try {
    return {
      gitSha: execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim(),
      gitBranch: execSync('git rev-parse --abbrev-ref HEAD', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim(),
    };
  } catch {
    return {};
  }
};

interface Clients {
  esClient: Client;
  kbnClient: KbnClient;
}

const connect = (config: LoadTestConfig, log: ToolingLog): Clients => {
  const options = {
    kibanaUrl: config.kibanaUrl,
    elasticsearchUrl: config.elasticsearchUrl,
    auth: config.auth,
    // The default space has no `/s/<space>` prefix.
    spaceId: config.spaceId === 'default' ? undefined : config.spaceId,
  };
  return { esClient: createEsClient(options), kbnClient: createKbnClient({ ...options, log }) };
};

interface Preflight {
  worker: Awaited<ReturnType<typeof getWorker>>;
  workerWorkflowId: string;
  analysisRuntimeConfig: Record<string, unknown>;
}

/** Fails early, with the fix, when the target cannot run the test. Changes nothing on the target. */
const preflight = async (
  { kbnClient, esClient }: Clients,
  config: LoadTestConfig,
  log: ToolingLog
): Promise<Preflight> => {
  await kbnClient.request({ method: 'GET', path: '/api/status', headers: { 'kbn-xsrf': 'true' } });
  const esInfo = await esClient.info();
  log.info(
    `Connected to ${config.kibanaUrl}, ES cluster ${esInfo.cluster_name} (${esInfo.version.number})`
  );

  const worker = await getWorker({ kbnClient, workerId: ALERT_TRIAGE_WORKER_ID }).catch((error) => {
    if (getStatusCode(error) !== 404) throw error;
    throw new Error(
      'The AlertZero API is not available (404). Enable xpack.agenticInvestigations.enabled and ' +
        `xpack.alertzero.enabled, then turn on the securitySolution:enableAlertZero setting in space "${config.spaceId}".`
    );
  });
  if (!worker?.workflowId) {
    throw new Error(
      `The Alert Triage Worker is not installed in space "${config.spaceId}". Turn it on in AlertZero (Watches) first.`
    );
  }
  if (!worker.enabled) {
    throw new Error(
      'The Alert Triage Worker is installed but disabled. Turn it on in AlertZero first; ' +
        'this tool does not change Worker settings, because turning it on attaches it to every detection rule.'
    );
  }

  const workflow = await getWorkflow({ kbnClient, workflowId: worker.workflowId });
  if (!workflow.enabled || !workflow.valid) {
    throw new Error(
      `Workflow ${worker.workflowId} is ${workflow.enabled ? 'invalid' : 'disabled'}.`
    );
  }

  const analysisRuntimeConfig = await getAnalysisRuntimeConfig({ kbnClient });
  if (analysisRuntimeConfig.workflowEnabled === false) {
    throw new Error(
      'Alert Analysis is turned off in this space; the Worker run would fail at its first step.'
    );
  }

  const alertsIndex = alertsIndexFor(config.spaceId);
  if (!(await esClient.indices.exists({ index: alertsIndex }))) {
    throw new Error(`${alertsIndex} does not exist. Open Security once to initialise detections.`);
  }

  await getTaskManagerHealth({ kbnClient }).catch((error) =>
    log.warning(
      `Task Manager health API is not readable (${formatError(error)}); drift will not be sampled.`
    )
  );

  log.info(
    `Worker ${worker.id}: workflow ${worker.workflowId}, autonomy ${
      worker.settings.autonomy ?? 'unknown'
    }`
  );
  return { worker, workerWorkflowId: worker.workflowId, analysisRuntimeConfig };
};

const buildPlan = (
  config: LoadTestConfig,
  counts: { truePositives: number; falsePositives: number }
) => {
  const common = {
    seed: config.seed,
    ruleCount: config.ruleCount,
    fpRate: config.fpRate,
    templateCounts: counts,
  };
  return config.mode === 'burst'
    ? buildBurstPlan({ ...common, batchCount: config.batchCount, batchSize: config.batchSize })
    : buildSustainedPlan({
        ...common,
        alertsPerHour: config.alertsPerHour,
        durationMs: config.durationMs,
        ruleIntervalMs: config.ruleIntervalMs,
        maxBatchSize: config.maxBatchSize,
        ruleSkew: config.ruleSkew,
      });
};

const logPlan = (plan: LoadPlan, log: ToolingLog): void => {
  const sizes = distribution(plan.batches.map(({ alerts }) => alerts.length));
  const distinctRules = new Set(plan.batches.map(({ ruleIndex }) => ruleIndex)).size;
  log.info(
    `Plan: ${plan.totalAlerts} alerts (${plan.falsePositiveAlerts} false positive, ` +
      `${Math.round((plan.falsePositiveAlerts / plan.totalAlerts) * 100)}%) in ${
        plan.batches.length
      } batches ` +
      `across ${distinctRules}/${plan.ruleCount} rules, dispatched over ${Math.round(
        plan.lastDispatchOffsetMs / 1000
      )}s`
  );
  if (sizes) {
    log.info(`Batch size: min ${sizes.min}, p50 ${sizes.p50}, p90 ${sizes.p90}, max ${sizes.max}`);
  }
};

const parametersOf = (config: LoadTestConfig): Record<string, unknown> => ({
  mode: config.mode,
  ruleCount: config.ruleCount,
  batchCount: config.batchCount,
  batchSize: config.batchSize,
  alertsPerHour: config.alertsPerHour,
  durationMs: config.durationMs,
  ruleIntervalMs: config.ruleIntervalMs,
  maxBatchSize: config.maxBatchSize,
  ruleSkew: config.ruleSkew,
  fpRate: config.fpRate,
  seed: config.seed,
  templateTag: config.templateTag,
  dispatchConcurrency: config.dispatchConcurrency,
  pollIntervalMs: config.pollIntervalMs,
  settleTimeoutMs: config.settleTimeoutMs,
});

const finalizeReport = async ({
  clients: { esClient, kbnClient },
  manifest,
  paths,
  log,
}: {
  clients: Clients;
  manifest: RunManifest;
  paths: RunPaths;
  log: ToolingLog;
}): Promise<void> => {
  const dispatches = readDispatches(paths);
  const snapshot = await fetchProgress({
    kbnClient,
    workerWorkflowId: manifest.workerWorkflowId,
    childWorkflowIds: manifest.childWorkflowIds,
    dispatches,
    runStartedAt: manifest.startedAt,
  });

  const stepExecutions = Object.fromEntries(
    await Promise.all(
      REPORTED_STEP_IDS.map(async (stepId) => [
        stepId,
        await listStepExecutions({
          kbnClient,
          workflowId: manifest.workerWorkflowId,
          stepId,
          startedAfter: manifest.startedAt,
        }),
      ])
    )
  );

  const triagedAlertIds = classifyDispatches({ dispatches, snapshot })
    .filter(({ workDoneStep }) => workDoneStep?.finishedAt)
    .flatMap(({ dispatch }) => dispatch.alerts.map(({ id }) => id));
  const verdictsByAlertId = await fetchVerdicts({
    esClient,
    alertsIndex: manifest.alertsIndex,
    alertIds: triagedAlertIds,
  });

  const report = buildReport({
    dispatches,
    snapshot,
    stepExecutions,
    samples: readSamples(paths),
    verdictsByAlertId,
    runStartedAt: manifest.startedAt,
    runEndedAt: manifest.endedAt ?? new Date().toISOString(),
  });

  writeJson(paths.report, report);
  const markdown = renderReportMarkdown(report);
  fs.writeFileSync(paths.summary, markdown);
  log.info(`\n${markdown}`);
  log.info(`Report written to ${paths.dir}`);
};

const runCommand = async (config: LoadTestConfig, log: ToolingLog): Promise<void> => {
  const runId = config.runId ?? generateRunId();
  const paths = buildRunPaths(config.outDir, runId);
  assertRunIsNew(paths, runId);

  const clients = connect(config, log);
  const { esClient, kbnClient } = clients;
  // A dry run only builds the plan, so it needs the alerts to clone but not a working Worker.
  const target = config.dryRun ? undefined : await preflight(clients, config, log);

  const alertsIndex = alertsIndexFor(config.spaceId);
  const pool = await loadTemplatePool({
    esClient,
    alertsIndex,
    templateTag: config.templateTag,
    maxPerLabel: config.maxTemplatesPerLabel,
  });
  log.info(
    `Template pool from ${alertsIndex} (rule tag "${config.templateTag}"): ` +
      `${pool.truePositives.length} true-positive, ${pool.falsePositives.length} false-positive alerts`
  );

  let plan: LoadPlan;
  try {
    plan = buildPlan(config, {
      truePositives: pool.truePositives.length,
      falsePositives: pool.falsePositives.length,
    });
  } catch (error) {
    throw new Error(
      `${formatError(error)}\nSeed alert templates first with scripts/data/generate.ts ` +
        `(--alert-mode preview --fp-count 3 --packs okta,aws-iam,kubernetes,github-actions).`
    );
  }
  logPlan(plan, log);

  if (!target) {
    writeJson(paths.plan, plan);
    log.info(`Dry run: plan written to ${paths.plan}; nothing was indexed or dispatched.`);
    return;
  }
  const { worker, workerWorkflowId, analysisRuntimeConfig } = target;

  const manifest: RunManifest = {
    runId,
    startedAt: new Date().toISOString(),
    ...gitInfo(),
    kibanaUrl: config.kibanaUrl,
    elasticsearchUrl: config.elasticsearchUrl,
    spaceId: config.spaceId,
    alertsIndex,
    workerWorkflowId,
    childWorkflowIds: config.childWorkflowIds,
    parameters: parametersOf(config),
    worker,
    analysisRuntimeConfig,
    plan: {
      batches: plan.batches.length,
      alerts: plan.totalAlerts,
      falsePositiveAlerts: plan.falsePositiveAlerts,
      lastDispatchOffsetMs: plan.lastDispatchOffsetMs,
    },
  };
  createRunManifest(paths, manifest);
  writeJson(paths.plan, plan);
  log.info(`Run ${runId}: writing to ${paths.dir}`);

  const dispatches: DispatchRecord[] = [];
  const collector = startCollector({
    kbnClient,
    log,
    workerWorkflowId,
    childWorkflowIds: config.childWorkflowIds,
    getDispatches: () => dispatches,
    runStartedAt: manifest.startedAt,
    intervalMs: config.pollIntervalMs,
    samplesFile: paths.samples,
    taskManagerRawFile: paths.taskManagerRaw,
  });

  try {
    await executePlan({
      plan,
      dispatchConcurrency: config.dispatchConcurrency,
      esClient,
      kbnClient,
      log,
      pool,
      runId,
      alertsIndex,
      workerWorkflowId,
      onDispatched: (record) => {
        dispatches.push(record);
        appendNdjson(paths.dispatches, record);
      },
    });

    if (config.wait) {
      log.info(
        `All batches dispatched. Waiting up to ${Math.round(
          config.settleTimeoutMs / 60000
        )}m for them to be triaged (Worker runs parked on a proposal count as triaged)...`
      );
      const { settled } = await collector.waitUntilSettled(config.settleTimeoutMs);
      if (!settled) log.warning('Timed out before every batch settled; the report is partial.');
    }
  } finally {
    await collector.sampleNow();
    await collector.stop();
    manifest.endedAt = new Date().toISOString();
    writeJson(paths.manifest, manifest);
  }

  await finalizeReport({ clients, manifest, paths, log });
};

const reportCommand = async (config: LoadTestConfig, log: ToolingLog): Promise<void> => {
  if (!config.runId) throw new Error('report needs --run-id');
  const paths = buildRunPaths(config.outDir, config.runId);
  const manifest = readJson<RunManifest>(paths.manifest);
  log.info(
    `Using ${manifest.kibanaUrl} (space ${manifest.spaceId}), where run ${config.runId} ran`
  );
  const clients = connect(withRunTarget(config, manifest), log);
  await finalizeReport({ clients, manifest, paths, log });
};

const cleanCommand = async (config: LoadTestConfig, log: ToolingLog): Promise<void> => {
  if (config.cancelExecutions && !config.runId) {
    throw new Error('--cancel-executions needs --run-id');
  }

  // A run remembers where it ran. Without one, the target comes from the command line.
  const paths = config.runId ? buildRunPaths(config.outDir, config.runId) : undefined;
  const manifest =
    paths && fs.existsSync(paths.manifest) ? readJson<RunManifest>(paths.manifest) : undefined;
  if (paths && !manifest) {
    if (config.cancelExecutions) {
      throw new Error(`Missing ${paths.manifest}; --cancel-executions needs the run's manifest.`);
    }
    log.warning(
      `No manifest for run ${config.runId} in ${paths.dir}; using the target given on the command line.`
    );
  }
  const target = manifest ? withRunTarget(config, manifest) : config;
  const { esClient, kbnClient } = connect(target, log);
  const alertsIndex = manifest?.alertsIndex ?? alertsIndexFor(target.spaceId);

  if (config.cancelExecutions && paths && manifest) {
    const dispatches = readDispatches(paths);
    const snapshot = await fetchProgress({
      kbnClient,
      workerWorkflowId: manifest.workerWorkflowId,
      childWorkflowIds: [],
      dispatches,
      runStartedAt: manifest.startedAt,
    });
    const open = snapshot.workerExecutions.filter(({ status }) => !TERMINAL_STATUSES.has(status));
    log.info(`Cancelling ${open.length} open Worker execution(s) of run ${config.runId}`);
    for (const { id } of open) {
      await cancelExecution({ kbnClient, executionId: id }).catch((error) =>
        log.warning(`Could not cancel ${id}: ${formatError(error)}`)
      );
    }
    log.warning(
      'Proposals and Investigations the Worker already created are not removed; decide or delete them in AlertZero.'
    );
  }

  const tag = config.runId ? loadTestRunTag(config.runId) : LOAD_TEST_TAG;
  const response = await esClient.deleteByQuery({
    index: alertsIndex,
    refresh: true,
    conflicts: 'proceed',
    query: { term: { 'kibana.alert.rule.tags': tag } },
  });
  log.info(`Deleted ${response.deleted ?? 0} alert(s) tagged "${tag}" from ${alertsIndex}`);
};

run(
  async ({ log, flags }) => {
    const positional = Array.isArray(flags._) ? flags._.map(String) : [];
    const config = buildConfig(flags, positional);
    if (config.command === 'run') return runCommand(config, log);
    if (config.command === 'report') return reportCommand(config, log);
    return cleanCommand(config, log);
  },
  {
    description:
      'Load test the Alert Triage Worker: index synthetic alerts, start the Worker on them at a chosen rate, and measure how it copes.',
    usage: 'node scripts/data/alert_triage_load_test/cli.js <run|report|clean> [options]',
    flags: {
      string: [
        'mode',
        'rules',
        'batches',
        'batch-size',
        'alerts-per-hour',
        'duration',
        'rule-interval',
        'max-batch-size',
        'rule-skew',
        'fp-rate',
        'seed',
        'template-tag',
        'max-templates',
        'child-workflow-ids',
        'poll-interval',
        'settle-timeout',
        'dispatch-concurrency',
        'out-dir',
        'run-id',
        'kibanaUrl',
        'elasticsearchUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
      ],
      boolean: ['wait', 'dry-run', 'cancel-executions'],
      default: {
        wait: true,
        'dry-run': false,
        'cancel-executions': false,
      },
      allowUnexpected: false,
      help: `
        Commands
          run      Index synthetic alerts, start the Worker on them, sample, then write the report.
          report   Rebuild the report of an earlier run from Kibana (needs --run-id).
          clean    Delete the alerts of a run (--run-id) or of every run (no --run-id).

        Load shape
          --mode                   burst (default: all batches at once) | sustained (a steady rate)
          --rules                  Synthetic rules the alerts are spread over (burst: 1, sustained: 300)
          --fp-rate                Share of alerts that are false positives, 0-1 (Default: 0.75)
          --seed                   Seed for a repeatable plan (Default: 1)
          burst:
            --batches              Batches dispatched at once (Default: 1)
            --batch-size           Alerts per batch (Default: 100)
          sustained:
            --alerts-per-hour      Total alert rate (Default: 1000)
            --duration             How long alerts keep arriving: 90s, 5m, 2h (Default: 1h)
            --rule-interval        Rule schedule; a rule's alerts in one interval form a batch (Default: 5m)
            --max-batch-size       Split batches larger than this; a detection rule hands over 100 alerts by default (Default: 100)
            --rule-skew            0 = even over rules, higher = concentrated on few rules (Default: 0)

        Templates
          --template-tag           Rule tag of the alerts to clone (Default: data-generator). Seed them with generate.ts.
          --max-templates          Templates read per label (Default: 500)

        Measuring
          --poll-interval          How often to sample (Default: 30s)
          --settle-timeout         How long to wait for every batch to be triaged (Default: 30m)
          --child-workflow-ids     Comma-separated workflows to count besides the Worker
          --no-wait                Dispatch, then report immediately
          --dry-run                Build the plan and write it; change nothing
          --out-dir                Where run folders go (Default: target/triage-load-test)
          --run-id                 Name of the run folder (run) or the run to report on / clean
          --cancel-executions      With clean: also cancel the run's open Worker executions

        Connection (same as generate.ts)
          --kibanaUrl, --elasticsearchUrl, --spaceId
          --username / --password, or --apiKey (or ES_API_KEY)
      `,
    },
  }
);
