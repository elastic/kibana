/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { ensureRef7707CalderaPack } from './caldera/bootstrap';
import { CalderaClient } from './caldera/client';
import { DEFAULT_WEB_PORT, REF7707_DOMAINS } from './constants';

const pickRandom = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const trimSlash = (s: string) => s.replace(/\/$/, '');
const calderaOperationPermalink = (calderaUrl: string, operationId: string) =>
  `${trimSlash(calderaUrl)}/#/operations/${operationId}`;
const calderaOperationsListLink = (calderaUrl: string) => `${trimSlash(calderaUrl)}/#/operations`;

const isBrowserVisit = (name: unknown) =>
  typeof name === 'string' && name.toLowerCase().includes('browser visit');

const fmt = (v: unknown) =>
  typeof v === 'string' ? v : v != null ? JSON.stringify(v, null, 2) : '';

const summarizeLink = (link: any) => {
  const abilityName = link?.ability?.name ?? link?.ability ?? link?.ability_name ?? 'unknown';
  const paw = link?.paw ?? link?.agent ?? link?.host ?? 'unknown';
  const executor = link?.executor ?? link?.command?.executor ?? 'unknown';
  const status =
    link?.status ??
    (link?.finish ? 'finished' : link?.start ? 'running' : 'pending') ??
    link?.state ??
    'unknown';
  return { abilityName, paw, executor, status };
};

const printLinkLogs = ({
  log,
  link,
  linkDetails,
  result,
}: {
  log: any;
  link: any;
  linkDetails?: any;
  result?: any;
}) => {
  const { abilityName, paw, executor, status } = summarizeLink(link);
  log.info(
    `[caldera][link] ability="${abilityName}" paw=${paw} executor=${executor} status=${status}`
  );

  const stdout =
    result?.stdout ??
    result?.output ??
    linkDetails?.stdout ??
    linkDetails?.output ??
    linkDetails?.result ??
    link?.output ??
    link?.result ??
    link?.response ??
    '';
  const stderr = result?.stderr ?? linkDetails?.stderr ?? link?.stderr ?? '';
  const error = result?.error ?? linkDetails?.error ?? link?.error ?? '';

  const cmd =
    link?.command ?? link?.ability?.executors?.[0]?.command ?? link?.display?.command ?? '';
  if (cmd) {
    log.info(`[caldera][link] command:\n${fmt(cmd)}`);
  }
  if (stdout) {
    log.info(`[caldera][link] stdout:\n${fmt(stdout)}`);
  }
  if (stderr) {
    log.info(`[caldera][link] stderr:\n${fmt(stderr)}`);
  }
  if (error) {
    log.info(`[caldera][link] error:\n${fmt(error)}`);
  }

  // If Caldera doesn't expose stdout/stderr via the API (common), dump extra fields for failed links.
  const isFailure = String(status) !== '0' && String(status).toLowerCase() !== 'finished';
  if (isFailure && linkDetails) {
    const minimal = {
      id: linkDetails?.id ?? link?.id,
      ability: linkDetails?.ability,
      paw: linkDetails?.paw,
      status: linkDetails?.status,
      state: linkDetails?.state,
      start: linkDetails?.start,
      finish: linkDetails?.finish,
      output: linkDetails?.output,
      error: linkDetails?.error,
    };
    log.info(`[caldera][link] debug (failed link fields):\n${fmt(minimal)}`);
  }
};

const runOp: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const calderaUrl = (flags.calderaUrl as string) || 'http://127.0.0.1:8888';
  const calderaApiKey = (flags.calderaApiKey as string) || process.env.CALDERA_API_KEY || '';
  const group = (flags.group as string) || 'ref7707';
  const domain = (flags.domain as string) || REF7707_DOMAINS[0];
  const webPort = flags.webPort ? Number(flags.webPort) : DEFAULT_WEB_PORT;
  const dnsIp = (flags.dnsIp as string) || '';
  const webIp = (flags.webIp as string) || '';
  const waitMs = flags.waitMs ? Number(flags.waitMs) : 10 * 60 * 1000;

  if (!calderaApiKey) {
    throw new Error(`--calderaApiKey is required (or set CALDERA_API_KEY env var)`);
  }

  const { adversaryId, abilityIds } = await ensureRef7707CalderaPack({
    calderaUrl,
    calderaApiKey,
    log,
    domain,
    webPort,
    dnsIp: dnsIp || undefined,
    webIp: webIp || undefined,
  });
  if (!adversaryId) {
    throw new Error(`Unable to determine Caldera adversary id for REF7707 lab pack`);
  }

  const caldera = new CalderaClient({ calderaUrl, apiKey: calderaApiKey });

  // Target ONE random agent per run (reduces noise and makes runs easier to debug).
  let agents = await caldera.getAgents();
  // Some Caldera deployments mark agents as trusted=false by default; don't exclude them.
  let candidates = agents.filter((a) => a?.group === group && a?.paw);

  // Self-heal: if users previously aborted runs, agents can be left in ref7707-run-* groups.
  // If requested group is empty but we see stale run groups, move them back to the requested group.
  if (!candidates.length) {
    const stale = agents.filter(
      (a) => typeof a?.group === 'string' && a.group.startsWith('ref7707-run-') && a?.paw
    );
    if (stale.length) {
      log.warning(
        `[caldera] no agents found in group [${group}], but found ${stale.length} agent(s) in stale ref7707-run-* groups; restoring them to [${group}]`
      );
      for (const a of stale) {
        try {
          await caldera.updateAgent(a.paw as string, { group });
        } catch (e) {
          log.warning(`[caldera] failed to restore agent group for ${a.paw}: ${e}`);
        }
      }
      agents = await caldera.getAgents();
      candidates = agents.filter((a) => a?.group === group && a?.paw);
    }
  }

  if (!candidates.length) {
    throw new Error(
      `[caldera] no agents found in group [${group}]. Ensure sandcat is running with '-group ${group}'.`
    );
  }
  const targetAgent = pickRandom(candidates);
  const targetPaw = targetAgent.paw as string;
  log.info(`[caldera] selected random target agent: ${targetPaw} (group=${group})`);

  // Caldera's `host_group` can be auto-populated server-side; reliably target one agent by
  // temporarily moving it into a unique per-run group, then targeting that group.
  const original = await caldera.getAgentByPaw(targetPaw);
  const originalGroup = (original?.group as string) || group;
  const runGroup = `ref7707-run-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

  const restoreGroup = async () => {
    try {
      await caldera.updateAgent(targetPaw, { group: originalGroup });
      log.info(`[caldera] restored agent ${targetPaw} group: ${runGroup} -> ${originalGroup}`);
    } catch (e) {
      log.warning(
        `[caldera] failed to restore agent ${targetPaw} group back to ${originalGroup}: ${e}`
      );
    }
  };

  // Ensure we restore group even when user interrupts the process.
  const onSignal = async (sig: NodeJS.Signals) => {
    log.warning(`[caldera] received ${sig}; restoring agent group and exiting...`);
    await restoreGroup();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  await caldera.updateAgent(targetPaw, { group: runGroup });
  log.info(`[caldera] moved agent ${targetPaw} group: ${originalGroup} -> ${runGroup}`);

  let operationId: string | undefined;
  try {
    const opName = `ref7707-lab-${group}-${Date.now()}`;
    const operation = await caldera.createOperation({
      name: opName,
      adversary: { adversary_id: adversaryId },
      state: 'running',
      autonomous: 1,
      auto_close: true,
      group: runGroup,
    });

    operationId = operation?.id;
    log.info(`[caldera] created operation: ${opName}${operationId ? ` (${operationId})` : ''}`);
    if (operationId) {
      log.info(`[caldera] dashboard: ${calderaOperationPermalink(calderaUrl, operationId)}`);
    }
    log.info(`[caldera] dashboard: ${calderaOperationsListLink(calderaUrl)}`);

    // Best-effort wait: print progress while Caldera produces links
    const start = Date.now();
    while (Date.now() - start < waitMs) {
      if (!operationId) break;
      const ops = await caldera.getOperations();
      const op = ops.find((o) => o?.id === operationId);
      const chainLen = Array.isArray(op?.chain) ? op.chain.length : 0;
      const state = op?.state ?? 'unknown';
      log.info(`[caldera] operation state=${state} chain=${chainLen}`);
      if (state === 'finished') break;
      // Some Caldera deployments don't always advance state promptly; treat "all links finished" as done.
      if (abilityIds.length && chainLen >= abilityIds.length) {
        const links = await caldera.getOperationLinks(operationId);
        const finishedLinks = links.filter((l) => Boolean(l?.finish));
        log.info(
          `[caldera] links finished=${finishedLinks.length}/${links.length} (expected=${abilityIds.length})`
        );
        if (links.length >= abilityIds.length && finishedLinks.length >= abilityIds.length) {
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 10_000));
    }

    if (operationId) {
      const ops = await caldera.getOperations();
      const op = ops.find((o) => o?.id === operationId);
      const state = op?.state ?? 'unknown';
      const chainLen = Array.isArray(op?.chain) ? op.chain.length : 0;
      if (abilityIds.length && chainLen >= abilityIds.length) {
        const links = await caldera.getOperationLinks(operationId);
        const finishedLinks = links.filter((l) => Boolean(l?.finish));
        if (links.length >= abilityIds.length && finishedLinks.length >= abilityIds.length) {
          // Print logs for all links (best-effort) so users can debug without opening Caldera UI.
          log.info(
            `[caldera] fetching link results for operation ${operationId} (${links.length} link(s))`
          );
          const sorted = [...links].sort((a, b) =>
            String(a?.ability?.name ?? a?.ability ?? '').localeCompare(
              String(b?.ability?.name ?? b?.ability ?? '')
            )
          );
          for (const link of sorted) {
            const linkId = link?.id ?? link?.link_id ?? '';
            let linkDetails: any | undefined;
            let result: any | undefined;
            if (operationId && linkId) {
              try {
                result = await caldera.getOperationLinkResult(operationId, String(linkId));
              } catch {
                // Some deployments don't expose /result. Fall back to link object.
                result = undefined;
              }
              try {
                linkDetails = await caldera.getOperationLink(operationId, String(linkId));
              } catch {
                linkDetails = undefined;
              }
            }
            printLinkLogs({ log, link, linkDetails, result });
            if (isBrowserVisit(link?.ability?.name ?? link?.ability)) {
              log.info(
                `[caldera][browser] tip: check History DB + osquery custom_data_dir on the target host`
              );
            }
          }
          return;
        }
      }
      if (state !== 'finished') {
        throw new Error(
          `[caldera] operation did not finish within waitMs=${waitMs} (state=${state} chain=${chainLen}/${abilityIds.length})`
        );
      }
    }
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await restoreGroup();
  }
};

export const cli = () => {
  run(runOp, {
    description: `
Run the REF7707 lab adversary in Caldera against an agent group (default: ref7707).

This is designed to be used with GCP-provisioned agents (gcp_fleet_vm) where sandcat is started with:
  -group ref7707
`,
    flags: {
      string: ['calderaUrl', 'calderaApiKey', 'group', 'domain', 'dnsIp', 'webIp'],
      number: ['webPort', 'waitMs'],
      default: {
        calderaUrl: 'http://127.0.0.1:8888',
        group: 'ref7707',
        domain: '',
        dnsIp: '',
        webIp: '',
        webPort: DEFAULT_WEB_PORT,
        waitMs: 10 * 60 * 1000,
      },
      help: `
  --calderaUrl       Caldera base URL (default: http://127.0.0.1:8888)
  --calderaApiKey    Caldera API key (header KEY) (required)
  --group            Caldera agent group to target (default: ref7707)
  --domain           Domain to use (default: first REF7707 lab domain)
  --dnsIp            Optional: DNS VM IP for explicit dig @dnsIp (recommended for GCP)
  --webIp            Optional: Web VM IP for curl --resolve (recommended for GCP)
  --webPort          Web server port (default: 8080)
  --waitMs           How long to wait while printing operation progress (default: 10m)
`,
    },
  });
};
