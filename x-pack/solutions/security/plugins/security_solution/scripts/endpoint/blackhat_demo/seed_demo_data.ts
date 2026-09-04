/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import type { AlertMode } from '../../data/lib/alert_runner';
import { generateAndIndexAttackDiscoveries } from '../../data/lib/attack_discoveries';
import { createEsClient, createKbnClient, type StackAuth } from '../../data/lib/clients';
import { formatError } from '../../data/lib/type_guards';
import {
  cleanupBlackhatDemoData,
  DEMO_HOSTS,
  DEMO_TIMELINE_DURATION_MINUTES,
  PATIENT_ZERO_USER,
  seedBlackhatDemoData,
} from './demo_data';
import { FORENSIC_HOSTS, seedForensicTimeline } from './forensic_seed_data';
import { promoteEndpointAlerts } from './promote_alerts';

const normalizeApiKey = (input: string): string => input.trim().replace(/^ApiKey\s+/i, '');

const getStringFlag = (flags: Record<string, unknown>, name: string): string => {
  const v = flags[name];
  if (typeof v === 'string') return v;
  throw new Error(`Missing required --${name} (expected string)`);
};

const getOptionalStringFlag = (
  flags: Record<string, unknown>,
  name: string
): string | undefined => {
  const v = flags[name];
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  throw new Error(`Invalid --${name} (expected string)`);
};

export const cli = (): void => {
  run(
    async (cliContext) => {
      const { log, flags } = cliContext;

      const clean = Boolean(flags.clean);
      const cleanOnly = Boolean(flags['clean-only']);
      const attacks = Boolean(flags.attacks);
      const hoursAgo = Math.max(1, Number(flags['hours-ago'] ?? 3));
      const alertModeRaw = getOptionalStringFlag(flags, 'alert-mode') ?? 'preview';
      if (alertModeRaw !== 'preview' && alertModeRaw !== 'live' && alertModeRaw !== 'none') {
        throw new Error(`Invalid --alert-mode "${alertModeRaw}" (expected preview|live|none)`);
      }
      const alertMode: AlertMode = alertModeRaw;

      const kibanaUrl = getStringFlag(flags, 'kibanaUrl');
      const elasticsearchUrl = getStringFlag(flags, 'elasticsearchUrl');
      const username = getStringFlag(flags, 'username');
      const password = getStringFlag(flags, 'password');
      const apiKey =
        getOptionalStringFlag(flags, 'apiKey') ??
        process.env.ES_API_KEY ??
        process.env.ELASTIC_API_KEY;
      const spaceId = getOptionalStringFlag(flags, 'spaceId') ?? 'default';

      const auth: StackAuth = apiKey
        ? { type: 'apiKey', apiKey: normalizeApiKey(apiKey) }
        : { type: 'basic', username, password };

      const kbnClient = createKbnClient({
        kibanaUrl,
        elasticsearchUrl,
        auth,
        spaceId: spaceId === 'default' ? undefined : spaceId,
        log,
      });
      const esClient = createEsClient({
        kibanaUrl,
        elasticsearchUrl,
        auth,
        spaceId,
      });

      log.info(`Kibana URL: ${kibanaUrl}`);
      log.info(`Elasticsearch URL: ${elasticsearchUrl}`);
      log.info(`Space: ${spaceId}`);

      await kbnClient.request({
        method: 'GET',
        path: '/api/status',
        headers: { 'kbn-xsrf': 'true' },
      });
      const esInfo = await esClient.info();
      log.info(`Connected to ES cluster: ${esInfo.cluster_name} (${esInfo.version.number})`);

      if (clean || cleanOnly) {
        log.info('Cleaning previously seeded BlackHat / Forensic Watch demo data…');
        await cleanupBlackhatDemoData({ esClient, spaceId });
        log.success('Cleanup complete.');
      }

      if (cleanOnly) {
        return;
      }

      const baseTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      const startMs = baseTime.getTime();
      const endMs = startMs + DEMO_TIMELINE_DURATION_MINUTES * 60 * 1000;

      log.info(
        `Seeding kill chain ${FORENSIC_HOSTS.patientZero} → ${
          FORENSIC_HOSTS.domainController
        } (plus hunt host ${DEMO_HOSTS.lateralFinance}) starting ${baseTime.toISOString()}.`
      );

      await seedForensicTimeline({ esClient }, log, baseTime);
      await seedBlackhatDemoData({ esClient }, log, baseTime);

      const promoted = await promoteEndpointAlerts({
        esClient,
        kbnClient,
        log,
        spaceId,
        alertMode,
        startMs,
        endMs,
      });

      if (attacks) {
        log.warning(
          'Synthetic --attacks do not emit security.attackDiscoveryCreated, so Watch Floor will not park a proposal. Prefer Attack Discovery → Generate in the UI for the Forensic Watch path.'
        );
        try {
          const discoveries = await generateAndIndexAttackDiscoveries({
            esClient,
            kbnClient,
            log,
            spaceId,
            alertsIndex: `.alerts-security.alerts-${spaceId}`,
            authenticatedUsername: username,
            opts: { startMs, endMs: Date.now() },
          });
          log.info(`Indexed ${discoveries.length} synthetic Attack Discovery group(s).`);
        } catch (e) {
          log.warning(`Synthetic Attack Discovery generation failed: ${formatError(e)}`);
        }
      }

      log.success(
        `Seeded forensic timeline + ${promoted} Detection Engine alert(s) for Attack Discovery.`
      );
      log.info(
        [
          'Next steps for Forensic Watch:',
          `1. Confirm open Endpoint Security alerts on ${FORENSIC_HOSTS.patientZero} (user ${PATIENT_ZERO_USER}).`,
          '2. Open Attack Discovery and click Generate (real LLM). Do not rely on --attacks for Floor.',
          '3. Enable Watch Floor (and Forensic Watch) in the space if they are still off.',
          '4. Approve the Floor proposal. Forensic Watch reconstructs the WKSTN-RECV01 → SRV-DC01 timeline',
          `   (hash a3f5c9d1…, C2 185.220.101.42:443, Run\\\\Updater → svc.exe) and can still see ${DEMO_HOSTS.lateralFinance}.`,
        ].join('\n')
      );
    },
    {
      description:
        'Seed BlackHat / Forensic Watch demo telemetry: WKSTN-RECV01 ransomware kill chain, Elastic Defend alerts, Detection Engine promotion, optional synthetic Attack Discoveries',
      flags: {
        string: [
          'kibanaUrl',
          'elasticsearchUrl',
          'username',
          'password',
          'apiKey',
          'spaceId',
          'alert-mode',
          'hours-ago',
        ],
        boolean: ['clean', 'clean-only', 'attacks'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticsearchUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          apiKey: undefined,
          spaceId: 'default',
          'alert-mode': 'preview',
          'hours-ago': '3',
          clean: false,
          'clean-only': false,
          attacks: false,
        },
        allowUnexpected: false,
        help: `
        Seed the BlackHat 2026 / Forensic Watch kill chain into a local stack:

          WKSTN-RECV01 (phishing → encoded PowerShell → C2 → credential theft → SMB)
            → SRV-DC01 (WMI, Run-key, vssadmin, .locked, ransom note)
            + WIN-FIN-03 (same payload hash / C2 / Run-key, for "other hosts affected")

        Detection Engine alerts are minted immediately via Endpoint Security rule preview
        so Attack Discovery has a ransomware cluster. Synthetic --attacks do NOT trigger
        Watch Floor; click Generate in the Attack Discovery UI for that path.

        --clean                          Delete previously seeded demo docs, then re-seed
        --clean-only                     Delete previously seeded demo docs and exit
        --alert-mode                     preview (default: mint via Rule Preview) | live (enable Endpoint Security) | none
        --attacks                        Also write synthetic Attack Discoveries (no Floor signal)
        --hours-ago                      Kill-chain start offset from now (Default: 3)

        --username                       Kibana/Elasticsearch username (Default: elastic)
        --password                       Kibana/Elasticsearch password (Default: changeme)
        --apiKey                         Elasticsearch API key (or ES_API_KEY / ELASTIC_API_KEY)
        --kibanaUrl                      Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl               Elasticsearch URL (Default: http://127.0.0.1:9200)
        --spaceId                        Kibana space id (Default: default)
      `,
      },
    }
  );
};

cli();
