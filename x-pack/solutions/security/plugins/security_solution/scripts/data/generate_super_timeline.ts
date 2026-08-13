/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seed script for the Super Timeline feature (epic elastic/security-team#14357).
 *
 * Creates 3 timelines with distinct KQL queries, pinned events, and notes — enough
 * to test the "View Super Timeline" batch action on both the Timelines list page and
 * the Cases tab. Also creates a Case with all 3 timelines attached.
 *
 * Usage:
 *   node scripts/data/generate_super_timeline_cli.js [options]
 *
 * Typical dev run (defaults to localhost):
 *   node scripts/data/generate_super_timeline_cli.js
 *
 * With explicit credentials:
 *   node scripts/data/generate_super_timeline_cli.js \
 *     --kibanaUrl http://127.0.0.1:5601 \
 *     --username elastic --password changeme
 *
 * Remove previously generated data:
 *   node scripts/data/generate_super_timeline_cli.js --clean
 *
 * Prerequisites:
 *   1. Enable the Cases attachments feature flag in config/kibana.dev.yml:
 *        xpack.cases.attachments.enabled: true
 *      (The security.timeline attachment type requires the unified SO path.)
 *
 *   2. Run the main generator first so that alert documents exist to pin:
 *        node scripts/data/generate_cli.js -n 100
 */

import path from 'path';
import { spawnSync } from 'child_process';

import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';

import { createEsClient, createKbnClient } from './lib/clients';
import type { StackAuth } from './lib/clients';
import { formatError } from './lib/type_guards';

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPER_TIMELINE_TAG = 'super-timeline-seed';
const CASE_TITLE_PREFIX = '[Super Timeline seed]';

const TIMELINE_SEEDS = [
  {
    title: '[Super Timeline seed] Lateral Movement — Endpoint Processes',
    description: 'Analyst 1 scope: endpoint process anomalies. Created by generate_super_timeline.',
    kqlQuery: 'event.category: "process"',
    timelineNote: 'Suspicious process chain observed. Possible lateral movement via LOLbin.',
    eventNote: 'This specific process execution is worth escalating — rare parent-child combo.',
  },
  {
    title: '[Super Timeline seed] Credential Access — Authentication Events',
    description:
      'Analyst 2 scope: failed logins and privilege escalation. Created by generate_super_timeline.',
    kqlQuery: 'event.category: "authentication"',
    timelineNote: 'Multiple failed logins from same source IP. Possible brute-force in progress.',
    eventNote:
      'Login failure spike starts here — correlate with network traffic at same timestamp.',
  },
  {
    title: '[Super Timeline seed] Command & Control — Network Activity',
    description:
      'Analyst 3 scope: outbound connections to unusual destinations. Created by generate_super_timeline.',
    kqlQuery: 'event.category: "network"',
    timelineNote:
      'Outbound traffic to geo-blocked region. Consistent with C2 beacon — 60s interval.',
    eventNote: 'First beacon observed here. Destination IP appears in threat intel feed.',
  },
];

// ── Timeline API helpers ───────────────────────────────────────────────────────

const TIMELINE_HEADERS = {
  'kbn-xsrf': 'true',
  'elastic-api-version': '2023-10-31',
};

interface TimelineCreateResponse {
  savedObjectId: string;
  version: string;
  title: string;
}

const createTimeline = async ({
  kbnClient,
  log,
  seed,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  seed: (typeof TIMELINE_SEEDS)[number];
}): Promise<{ id: string; title: string }> => {
  const resp = await kbnClient.request<TimelineCreateResponse>({
    method: 'POST',
    path: '/api/timeline',
    headers: TIMELINE_HEADERS,
    body: {
      timelineId: null,
      version: null,
      timeline: {
        title: seed.title,
        description: seed.description,
        tags: [SUPER_TIMELINE_TAG],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: { expression: seed.kqlQuery, kind: 'kuery' },
          },
        },
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        columns: [
          { id: '@timestamp' },
          { id: 'user.name' },
          { id: 'event.category' },
          { id: 'event.action' },
          { id: 'host.name' },
        ],
      },
    },
  });

  const { savedObjectId, title } = resp.data;
  log.info(`  Created timeline "${title}" → ${savedObjectId}`);
  return { id: savedObjectId, title };
};

const pinEvent = async ({
  kbnClient,
  timelineId,
  eventId,
}: {
  kbnClient: KbnClient;
  timelineId: string;
  eventId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'PATCH',
    path: '/api/pinned_event',
    headers: TIMELINE_HEADERS,
    body: { timelineId, eventId },
  });
};

const addNote = async ({
  kbnClient,
  timelineId,
  eventId,
  noteText,
}: {
  kbnClient: KbnClient;
  timelineId: string;
  eventId?: string;
  noteText: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'PATCH',
    path: '/api/note',
    headers: TIMELINE_HEADERS,
    body: {
      note: {
        timelineId,
        ...(eventId ? { eventId } : {}),
        note: noteText,
      },
    },
  });
};

// ── ES helpers ────────────────────────────────────────────────────────────────

const fetchAlertIds = async ({
  esClient,
  spaceId,
  count,
  log,
}: {
  esClient: Client;
  spaceId: string;
  count: number;
  log: ToolingLog;
}): Promise<string[]> => {
  const index = `.alerts-security.alerts-${spaceId}`;
  try {
    const resp = await esClient.search({
      index,
      size: count,
      query: { match_all: {} },
      _source: false,
    });
    const ids = resp.hits.hits
      .map((h) => h._id)
      .filter((id): id is string => id != null && id.length > 0);
    log.info(`  Found ${ids.length} alert(s) in ${index} for pinning.`);
    return ids;
  } catch (e) {
    log.warning(
      `  Could not read from ${index}: ${formatError(e)}.\n` +
        `  Run "node scripts/data/generate_cli.js -n 100" first to seed alerts, then re-run this script.`
    );
    return [];
  }
};

// ── Cases helpers ─────────────────────────────────────────────────────────────

const createCase = async ({
  kbnClient,
  log,
  title,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  title: string;
}): Promise<string> => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/cases',
    headers: { 'kbn-xsrf': 'true' },
    body: {
      title,
      tags: [SUPER_TIMELINE_TAG],
      category: null,
      severity: 'medium',
      description:
        'Created by generate_super_timeline seed script. Contains 3 analyst timelines for Super Timeline testing.',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: false, extractObservables: false },
      owner: 'securitySolution',
      customFields: [],
    },
  });

  const caseId = resp.data.id;
  log.info(`  Created case "${title}" → ${caseId}`);
  return caseId;
};

const attachTimelineToCase = async ({
  kbnClient,
  log,
  caseId,
  timelineId,
  timelineTitle,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  caseId: string;
  timelineId: string;
  timelineTitle: string;
}): Promise<void> => {
  // Use the internal _bulk_create endpoint — same path the UI uses via the Cases hooks.
  // The unified attachment payload format (type: any string, attachmentId) is accepted here.
  await kbnClient.request({
    method: 'POST',
    path: `/internal/cases/${caseId}/attachments/_bulk_create`,
    headers: {
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
    },
    body: [
      {
        type: 'security.timeline',
        attachmentId: timelineId,
        owner: 'securitySolution',
        metadata: { title: timelineTitle },
      },
    ],
  });
  log.info(`  Attached "${timelineTitle}" to case.`);
};

// ── Cleanup ───────────────────────────────────────────────────────────────────

const cleanGeneratedData = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}): Promise<void> => {
  log.warning('--clean: removing Super Timeline seed timelines and case.');

  // Delete timelines whose title starts with the seed prefix
  interface TimelinesResponse {
    timeline: Array<{ savedObjectId: string; title: string }>;
    totalCount: number;
  }

  try {
    const resp = await kbnClient.request<TimelinesResponse>({
      method: 'GET',
      path: `/api/timelines?page_size=100&page_index=1&sort_field=updated&sort_order=desc`,
      headers: TIMELINE_HEADERS,
    });

    const seedIds = resp.data.timeline
      .filter((t) => t.title?.startsWith('[Super Timeline seed]'))
      .map((t) => t.savedObjectId);

    if (seedIds.length > 0) {
      await kbnClient.request({
        method: 'DELETE',
        path: '/api/timeline',
        headers: TIMELINE_HEADERS,
        body: { savedObjectIds: seedIds },
      });
      log.info(`  Deleted ${seedIds.length} seed timeline(s).`);
    } else {
      log.info('  No seed timelines found to delete.');
    }
  } catch (e) {
    log.warning(`  Failed to delete seed timelines: ${formatError(e)}`);
  }

  // Delete cases tagged with the seed tag
  interface FindCasesResponse {
    cases: Array<{ id: string }>;
    total: number;
  }

  try {
    const resp = await kbnClient.request<FindCasesResponse>({
      method: 'GET',
      path: '/api/cases/_find',
      headers: { 'kbn-xsrf': 'true' },
      query: { owner: 'securitySolution', tags: SUPER_TIMELINE_TAG, perPage: 100 },
    });

    const caseIds = resp.data.cases.map((c) => c.id);
    if (caseIds.length > 0) {
      await kbnClient.request({
        method: 'DELETE',
        path: '/api/cases',
        headers: { 'kbn-xsrf': 'true' },
        query: { ids: JSON.stringify(caseIds) },
      });
      log.info(`  Deleted ${caseIds.length} seed case(s).`);
    } else {
      log.info('  No seed cases found to delete.');
    }
  } catch (e) {
    log.warning(`  Failed to delete seed cases: ${formatError(e)}`);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────────

export const cli = () => {
  run(
    async (cliContext) => {
      const log = cliContext.log;
      const flags = cliContext.flags as Record<string, unknown>;

      const kibanaUrl = String(flags.kibanaUrl ?? 'http://127.0.0.1:5601');
      const elasticsearchUrl = String(flags.elasticsearchUrl ?? 'http://127.0.0.1:9200');
      const username = String(flags.username ?? 'elastic');
      const password = String(flags.password ?? 'changeme');
      const apiKeyRaw = flags.apiKey != null ? String(flags.apiKey).trim() : undefined;
      const spaceId = flags.spaceId != null ? String(flags.spaceId) : undefined;
      const clean = Boolean(flags.clean);
      const skipCase = Boolean(flags['skip-case']);
      const skipAlertSeed = Boolean(flags['skip-alert-seed']);

      const apiKey = apiKeyRaw?.replace(/^ApiKey\s+/i, '');
      const auth: StackAuth = apiKey
        ? { type: 'apiKey', apiKey }
        : { type: 'basic', username, password };

      const effectiveSpaceId = spaceId && spaceId.length > 0 ? spaceId : 'default';

      const kbnClient = createKbnClient({ kibanaUrl, elasticsearchUrl, auth, spaceId, log });
      const esClient = createEsClient({ kibanaUrl, elasticsearchUrl, auth, spaceId });

      // Sanity check
      // eslint-disable-next-line no-console
      console.log(`[super-timeline-seed] Kibana: ${kibanaUrl}`);
      await kbnClient.request({
        method: 'GET',
        path: '/api/status',
        headers: { 'kbn-xsrf': 'true' },
      });

      if (clean) {
        await cleanGeneratedData({ kbnClient, log });
        return;
      }

      // ── Step 1: Fetch alert IDs for pinning ─────────────────────────────────
      // Each timeline pins 3 alerts; timelines 0+1 share alert[1], timelines 1+2 share alert[4].
      // This creates intentional overlap to exercise the deduplication path in Super Timeline.
      log.info('Fetching alert IDs for event pinning…');
      const initialAlertIds = await fetchAlertIds({
        esClient,
        spaceId: effectiveSpaceId,
        count: 9,
        log,
      });

      let alertIds = initialAlertIds;
      if (initialAlertIds.length === 0 && !skipAlertSeed) {
        log.info('No alerts found — auto-seeding 100 alerts via generate_cli.js…');
        const generateCliPath = path.join(__dirname, 'generate_cli.js');
        const seedArgs = [
          generateCliPath,
          '-n',
          '100',
          '--kibanaUrl',
          kibanaUrl,
          '--elasticsearchUrl',
          elasticsearchUrl,
        ];
        if (apiKey) {
          seedArgs.push('--apiKey', apiKey);
        } else {
          seedArgs.push('--username', username, '--password', password);
        }
        const result = spawnSync(process.execPath, seedArgs, { stdio: 'inherit' });
        if (result.status !== 0) {
          log.warning('  Alert seeding failed — continuing without pinned events.');
        } else {
          alertIds = await fetchAlertIds({ esClient, spaceId: effectiveSpaceId, count: 9, log });
        }
      }

      const getAlertsForTimeline = (idx: number): string[] => {
        if (alertIds.length === 0) return [];
        // Timeline 0: [0, 1, 2]   (1 is shared with timeline 1)
        // Timeline 1: [1, 3, 4]   (1 shared with 0, 4 shared with 2)
        // Timeline 2: [4, 5, 6]   (4 shared with 1)
        const slots: number[][] = [
          [0, 1, 2],
          [1, 3, 4],
          [4, 5, 6],
        ];
        return slots[idx].map((i) => alertIds[i % alertIds.length]);
      };

      // ── Step 2: Create the 3 timelines ──────────────────────────────────────
      log.info('Creating seed timelines…');
      const timelines: Array<{ id: string; title: string }> = [];

      for (let i = 0; i < TIMELINE_SEEDS.length; i++) {
        const seed = TIMELINE_SEEDS[i];
        const { id, title } = await createTimeline({ kbnClient, log, seed });
        timelines.push({ id, title });

        // Pin events with intentional overlap across timelines
        const ids = getAlertsForTimeline(i);
        for (const eventId of ids) {
          try {
            await pinEvent({ kbnClient, timelineId: id, eventId });
          } catch (e) {
            log.warning(`  Could not pin event ${eventId}: ${formatError(e)}`);
          }
        }
        if (ids.length > 0) log.info(`  Pinned ${ids.length} event(s) to "${title}".`);

        // Timeline-level note
        await addNote({ kbnClient, timelineId: id, noteText: seed.timelineNote });

        // Event-level note on the first pinned event (if available)
        if (ids.length > 0) {
          await addNote({
            kbnClient,
            timelineId: id,
            eventId: ids[0],
            noteText: seed.eventNote,
          });
        }
        log.info(`  Added notes to "${title}".`);
      }

      // ── Step 3: Create a Case and attach all 3 timelines ────────────────────
      if (!skipCase) {
        log.info('Creating seed case with all 3 timelines attached…');
        const caseTitle = `${CASE_TITLE_PREFIX} Multi-Analyst Incident Investigation`;
        try {
          const caseId = await createCase({ kbnClient, log, title: caseTitle });
          for (const { id, title } of timelines) {
            try {
              await attachTimelineToCase({
                kbnClient,
                log,
                caseId,
                timelineId: id,
                timelineTitle: title,
              });
            } catch (e) {
              log.warning(`  Could not attach "${title}" to case: ${formatError(e)}`);
            }
          }
        } catch (e) {
          log.warning(`  Case creation failed: ${formatError(e)}`);
        }
      }

      // ── Summary ─────────────────────────────────────────────────────────────
      log.info('');
      log.info('=== Super Timeline seed complete ===');
      log.info('');
      log.info('To test the Timelines list entry point:');
      log.info('  1. Navigate to Security → Timelines');
      log.info('  2. Enable the flag in config/kibana.dev.yaml:');
      log.info('       xpack.securitySolution.enableExperimental:');
      log.info('         - superTimeline');
      log.info('  3. Select 2 or 3 of the "[Super Timeline seed]" timelines');
      log.info('  4. Click Batch actions → "View Super Timeline"');
      log.info('');
      if (!skipCase) {
        log.info('To test the Cases entry point:');
        log.info('  1. Navigate to Security → Cases');
        log.info(
          `  2. Open the case titled: ${CASE_TITLE_PREFIX} Multi-Analyst Incident Investigation`
        );
        log.info('  3. Select the Timelines tab, check 2+ rows, click "Batch actions"');
        log.info('');
      }
      log.info('To clean up: node scripts/data/generate_super_timeline_cli.js --clean');
    },
    {
      description:
        'Seed 3 analyst timelines (with pinned events + notes) and a Case for Super Timeline feature testing',
      flags: {
        string: ['kibanaUrl', 'elasticsearchUrl', 'username', 'password', 'apiKey', 'spaceId'],
        boolean: ['clean', 'skip-case', 'skip-alert-seed'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticsearchUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          apiKey: undefined,
          clean: false,
          'skip-case': false,
          'skip-alert-seed': false,
        },
        allowUnexpected: false,
        help: `
        --kibanaUrl          Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl   Elasticsearch URL (Default: http://127.0.0.1:9200)
        --username           Basic auth username (Default: elastic)
        --password           Basic auth password (Default: changeme)
        --apiKey             ES API key (overrides username/password). Set ES_API_KEY env var as alternative.
        --spaceId            Kibana space ID (optional, defaults to "default")
        --clean              Delete all seed timelines and cases, then exit
        --skip-case          Skip Case creation (only create the 3 timelines)
        --skip-alert-seed    Skip auto-seeding alerts when none are found (default: false)
        `,
      },
    }
  );
};

cli();
