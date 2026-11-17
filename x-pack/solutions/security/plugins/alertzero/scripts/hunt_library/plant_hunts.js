#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Plants, verifies and cleans realistic hunt data for the Hunt Library POC (plan 18, Phase 0).
 *
 * Every hunt gets benign noise the query must exclude, a benign-but-rare candidate, and a planted
 * suspicious scenario. Data goes to dedicated `*-huntplant` data streams (their own templates give
 * the fields real mappings), so `--clean` removes only what this script created and never touches
 * integration data.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/plant_hunts.js \
 *     <plant|verify|clean> [--es http://localhost:9200] [--user elastic] [--password changeme]
 *
 *   plant   Create templates and data streams, then index the scenarios (re-plant is idempotent).
 *   verify  Run every definition's candidate and surrounding query and assert the planted rows.
 *   clean   Delete the data streams and templates.
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const { Client } = require('@elastic/elasticsearch');
const { bindSurroundingQuery } = require('../../server/hunt_library/bind_surrounding_query');

const args = process.argv.slice(2);
const command = args.find((a) => ['plant', 'verify', 'clean'].includes(a));
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
if (!command) {
  console.error('Usage: plant_hunts.js <plant|verify|clean> [--es URL] [--user U] [--password P]');
  process.exit(2);
}

const client = new Client({
  node: argValue('--es', 'http://localhost:9200'),
  auth: { username: argValue('--user', 'elastic'), password: argValue('--password', 'changeme') },
});

const TAG = 'hunt-library-plant';
const TEMPLATE_PREFIX = 'zz-hunt-library-plant';
const definitionsDir = path.join(__dirname, '..', '..', 'server', 'hunt_library', 'definitions');

// --- Streams: explicit mappings for the fields the hunts read -------------------------------
const K = 'keyword';
const STREAMS = {
  api: {
    name: 'logs-endpoint.events.api-huntplant',
    fields: {
      'event.category': K,
      'host.os.family': K,
      'host.id': K,
      'host.name': K,
      'user.name': K,
      'process.Ext.api.name': K,
      'Target.process.name': K,
      'process.executable': {
        type: K,
        fields: { caseless: { type: K, normalizer: 'lowercase_norm' } },
      },
      'process.parent.executable': K,
      'process.command_line': K,
    },
  },
  sysmon: {
    name: 'logs-windows.sysmon_operational-huntplant',
    fields: {
      'event.category': K,
      'event.action': K,
      'host.os.family': K,
      'host.id': K,
      'host.name': K,
      'user.name': K,
      'process.executable': K,
      'winlog.event_data.TargetImage': K,
    },
  },
  network: {
    name: 'logs-endpoint.events.network-huntplant',
    fields: {
      'host.os.type': K,
      'event.type': K,
      'process.name': K,
      'destination.ip': 'ip',
      'destination.port': 'long',
      'user.name': K,
      'host.name': K,
    },
  },
  process: {
    name: 'logs-endpoint.events.process-huntplant',
    fields: {
      'host.os.type': K,
      'host.os.family': K,
      'event.type': K,
      'event.category': K,
      'event.action': K,
      'host.id': K,
      'host.name': K,
      'user.name': K,
      'process.name': K,
      'process.executable': K,
      'process.parent.executable': K,
      'process.parent.name': K,
      'process.command_line': K,
    },
  },
  okta: {
    name: 'logs-okta.system-huntplant',
    fields: {
      'event.dataset': K,
      'event.action': K,
      'okta.actor.type': K,
      'okta.actor.display_name': K,
      'okta.actor.alternate_id': K,
      'okta.outcome.result': K,
      'okta.outcome.reason': K,
      'okta.client.ip': 'ip',
    },
  },
  aws: {
    name: 'logs-aws.cloudtrail-huntplant',
    fields: {
      'event.provider': K,
      'event.action': K,
      'cloud.account.id': K,
      'user.name': K,
      'source.ip': 'ip',
      'aws.cloudtrail.request_parameters': K,
    },
  },
};

const toMappings = (fields) => ({
  properties: {
    '@timestamp': { type: 'date' },
    tags: { type: K },
    ...Object.fromEntries(
      Object.entries(fields).map(([name, spec]) => [
        name,
        typeof spec === 'string' ? { type: spec } : spec,
      ])
    ),
  },
});

// --- Scenario data ---------------------------------------------------------------------------
const NOW = Date.now();
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString();
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const win = (n) => ({ 'host.id': `win-host-${n}`, 'host.name': `WIN-HOST-${n}` });
const lin = (n) => ({ 'host.name': `linux-host-${n}` });

const scenarios = () => {
  const docs = [];
  const add = (stream, scenario, minutes, fields) =>
    docs.push({
      stream: STREAMS[stream].name,
      doc: { '@timestamp': minutesAgo(minutes), tags: [TAG, scenario], ...fields },
    });

  // 1. LSASS (Defend api events)
  const api = {
    'event.category': 'api',
    'host.os.family': 'windows',
    'Target.process.name': 'lsass.exe',
  };
  for (let h = 1; h <= 8; h++) {
    for (const exe of [
      'C:\\Windows\\System32\\svchost.exe',
      'C:\\Program Files\\Windows Defender\\MsMpEng.exe',
    ]) {
      repeat(6, (i) =>
        add('api', 'noise', 30 + h * 7 + i, {
          ...api,
          ...win(h),
          'user.name': 'SYSTEM',
          'process.Ext.api.name': 'OpenProcess',
          'process.executable': exe,
          'process.parent.executable': 'C:\\Windows\\System32\\services.exe',
        })
      );
    }
  }
  repeat(2, (i) =>
    add('api', 'benign_rare', 600 + i * 5, {
      ...api,
      ...win(3),
      'user.name': 'SYSTEM',
      'process.Ext.api.name': 'OpenProcess',
      'process.executable': 'C:\\Program Files\\Acme Backup\\acmebackup.exe',
      'process.parent.executable': 'C:\\Windows\\System32\\services.exe',
    })
  );
  repeat(3, (i) =>
    add('api', 'suspicious', 90 + i * 2, {
      ...api,
      ...win(5),
      'user.name': 'dave',
      'process.Ext.api.name': 'ReadProcessMemory',
      'process.executable': 'C:\\Users\\Public\\Libraries\\procdump64.exe',
      'process.parent.executable': 'C:\\Windows\\System32\\cmd.exe',
      'process.command_line': 'procdump64.exe -ma lsass.exe lsass.dmp',
    })
  );

  // 2. CreateRemoteThread (Sysmon)
  const crt = {
    'event.category': 'process',
    'event.action': 'CreateRemoteThread',
    'host.os.family': 'windows',
  };
  for (let h = 1; h <= 6; h++) {
    repeat(3, (i) =>
      add('sysmon', 'noise', 40 + h * 9 + i, {
        ...crt,
        ...win(h),
        'user.name': 'SYSTEM',
        'process.executable': 'C:\\Windows\\System32\\csrss.exe',
        'winlog.event_data.TargetImage': 'C:\\Windows\\System32\\conhost.exe',
      })
    );
  }
  add('sysmon', 'benign_rare', 700, {
    ...crt,
    ...win(2),
    'user.name': 'erin',
    'process.executable': 'C:\\Program Files\\Debugging Tools\\windbg.exe',
    'winlog.event_data.TargetImage': 'C:\\Windows\\System32\\notepad.exe',
  });
  add('sysmon', 'suspicious', 120, {
    ...crt,
    ...win(4),
    'user.name': 'carol',
    'process.executable': 'C:\\Users\\carol\\AppData\\Local\\Temp\\update_svc.exe',
    'winlog.event_data.TargetImage': 'C:\\Windows\\explorer.exe',
  });

  // 3. GTFOBins external connections (Linux network)
  const net = { 'host.os.type': 'linux', 'event.type': 'start' };
  repeat(40, (i) =>
    add('network', 'noise', 20 + i * 11, {
      ...net,
      ...lin(1 + (i % 4)),
      'user.name': 'deploy',
      'process.name': 'curl',
      'destination.ip': '10.0.0.15',
      'destination.port': 8080,
    })
  );
  repeat(12, (i) =>
    add('network', 'noise', 25 + i * 13, {
      ...net,
      ...lin(2),
      'user.name': 'deploy',
      'process.name': 'curl',
      'destination.ip': '93.184.216.34',
      'destination.port': 443,
    })
  );
  repeat(2, (i) =>
    add('network', 'benign_rare', 800 + i * 3, {
      ...net,
      ...lin(1),
      'user.name': 'builder',
      'process.name': 'pip',
      'destination.ip': '151.101.0.223',
      'destination.port': 443,
    })
  );
  repeat(2, (i) =>
    add('network', 'suspicious', 150 + i * 4, {
      ...net,
      ...lin(3),
      'user.name': 'www-data',
      'process.name': 'bash',
      'destination.ip': '45.33.32.156',
      'destination.port': 4444,
    })
  );

  // 4. Okta failed OAuth token grants (raw) and 6. password spraying (aggregate)
  const okta = { 'event.dataset': 'okta.system' };
  repeat(3, (i) =>
    add('okta', 'noise', 50 + i, {
      ...okta,
      'event.action': 'app.oauth2.as.token.grant',
      'okta.actor.type': 'PublicClientApp',
      'okta.actor.display_name': 'Okta Browser Plugin',
      'okta.outcome.result': 'FAILURE',
      'okta.outcome.reason': 'no_matching_scope',
      'okta.client.ip': '192.0.2.10',
    })
  );
  add('okta', 'benign_rare', 900, {
    ...okta,
    'event.action': 'app.oauth2.as.token.grant',
    'okta.actor.type': 'PublicClientApp',
    'okta.actor.display_name': 'Internal Dev Portal',
    'okta.outcome.result': 'FAILURE',
    'okta.outcome.reason': 'no_matching_scope',
    'okta.client.ip': '192.0.2.44',
  });
  repeat(4, (i) =>
    add('okta', 'suspicious', 200 + i * 3, {
      ...okta,
      'event.action': 'app.oauth2.as.token.grant',
      'okta.actor.type': 'PublicClientApp',
      'okta.actor.display_name': 'Totally Legit App',
      'okta.outcome.result': 'FAILURE',
      'okta.outcome.reason': 'no_matching_scope',
      'okta.client.ip': '185.220.101.4',
    })
  );
  const login = (ip, user, minutes, scenario) =>
    add('okta', scenario, minutes, {
      ...okta,
      'event.action': 'user.session.start',
      'okta.actor.type': 'User',
      'okta.actor.display_name': user,
      'okta.actor.alternate_id': `${user}@example.com`,
      'okta.outcome.result': 'FAILURE',
      'okta.outcome.reason': 'INVALID_CREDENTIALS',
      'okta.client.ip': ip,
    });
  for (let u = 1; u <= 14; u++) login('185.220.101.4', `target${u}`, 210 + u, 'suspicious');
  for (let u = 1; u <= 10; u++) login('203.0.113.5', `staff${u}`, 950 + u, 'benign_rare');
  for (let u = 1; u <= 3; u++) login(`198.51.100.${u}`, `casual${u}`, 60 + u, 'noise');

  // 5. AWS cross-account assume-role creation (CloudTrail)
  const trust = (account) =>
    `{roleName=ops-helper, assumeRolePolicyDocument={"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS": "arn:aws:iam::${account}:root"},"Action":"sts:AssumeRole"}]}}`;
  const aws = { 'event.provider': 'iam.amazonaws.com', 'event.action': 'CreateRole' };
  add('aws', 'noise', 80, {
    ...aws,
    'cloud.account.id': '111122223333',
    'user.name': 'terraform',
    'source.ip': '198.51.100.9',
    'aws.cloudtrail.request_parameters': trust('111122223333'),
  });
  add('aws', 'suspicious', 140, {
    ...aws,
    'cloud.account.id': '111122223333',
    'user.name': 'build-bot',
    'source.ip': '185.220.101.4',
    'aws.cloudtrail.request_parameters': trust('999988887777'),
  });
  add('aws', 'suspicious', 135, {
    'event.provider': 'iam.amazonaws.com',
    'event.action': 'AttachRolePolicy',
    'cloud.account.id': '111122223333',
    'user.name': 'build-bot',
    'source.ip': '185.220.101.4',
    'aws.cloudtrail.request_parameters':
      '{roleName=ops-helper, policyArn=arn:aws:iam::aws:policy/AdministratorAccess}',
  });
  add('aws', 'benign_rare', 1000, {
    ...aws,
    'cloud.account.id': '555566667777',
    'user.name': 'vendor-onboarding',
    'source.ip': '198.51.100.20',
    'aws.cloudtrail.request_parameters': trust('444455556666'),
  });

  // 7. Linux uncommon execution from suspicious directories
  const exec = { 'host.os.type': 'linux', 'event.type': 'start', 'event.action': 'exec' };
  repeat(8, (i) =>
    add('process', 'noise', 30 + i * 17, {
      ...exec,
      ...lin(1 + (i % 3)),
      'user.name': 'ci',
      'process.executable': '/usr/bin/ls',
      'process.parent.executable': '/bin/bash',
      'process.name': 'ls',
    })
  );
  repeat(5, (i) =>
    add('process', 'noise', 45 + i * 19, {
      ...exec,
      ...lin(2),
      'user.name': 'ci',
      'process.executable': '/tmp/4821937',
      'process.parent.executable': '/bin/bash',
      'process.name': '4821937',
    })
  );
  add('process', 'benign_rare', 1100, {
    ...exec,
    ...lin(1),
    'user.name': 'deploy',
    'process.executable': '/var/www/app/bin/migrate',
    'process.parent.executable': '/usr/bin/sudo',
    'process.name': 'migrate',
    'process.command_line': '/var/www/app/bin/migrate --env prod',
  });
  repeat(2, (i) =>
    add('process', 'suspicious', 160 + i * 5, {
      ...exec,
      ...lin(3),
      'user.name': 'www-data',
      'process.executable': '/dev/shm/.x/kworker',
      'process.parent.executable': '/bin/bash',
      'process.name': 'kworker',
      'process.command_line': '/dev/shm/.x/kworker -o pool.example.net:3333',
    })
  );

  // 8. rundll32 command lines
  const proc = {
    'host.os.family': 'windows',
    'event.category': 'process',
    'event.action': 'start',
    'process.name': 'rundll32.exe',
  };
  for (let h = 1; h <= 6; h++) {
    add('process', 'noise', 55 + h * 6, {
      ...proc,
      ...win(h),
      'user.name': 'SYSTEM',
      'process.command_line': 'rundll32.exe vendorx.dll,Heartbeat',
      'process.parent.name': 'vendorx.exe',
    });
  }
  add('process', 'benign_rare', 1200, {
    ...proc,
    ...win(2),
    'user.name': 'frank',
    'process.command_line': 'rundll32.exe "C:\\Vendor Tools\\upd.dll",CheckUpdates',
    'process.parent.name': 'vendorupdater.exe',
  });
  add('process', 'suspicious', 100, {
    ...proc,
    ...win(5),
    'user.name': 'dave',
    'process.command_line': 'rundll32.exe C:\\Users\\dave\\AppData\\Roaming\\upd\\core.dll,Start',
    'process.parent.name': 'winword.exe',
  });
  return docs;
};

// --- Commands --------------------------------------------------------------------------------
const clean = async () => {
  for (const { name } of Object.values(STREAMS)) {
    await client.indices.deleteDataStream({ name }, { ignore: [404] });
  }
  for (const key of Object.keys(STREAMS)) {
    await client.indices.deleteIndexTemplate(
      { name: `${TEMPLATE_PREFIX}-${key}` },
      { ignore: [404] }
    );
  }
};

const plant = async () => {
  await clean();
  for (const [key, { name, fields }] of Object.entries(STREAMS)) {
    await client.indices.putIndexTemplate({
      name: `${TEMPLATE_PREFIX}-${key}`,
      index_patterns: [name],
      data_stream: {},
      priority: 600,
      template: {
        settings: {
          number_of_replicas: 0,
          analysis: { normalizer: { lowercase_norm: { type: 'custom', filter: ['lowercase'] } } },
        },
        mappings: toMappings(fields),
      },
    });
  }
  const docs = scenarios();
  const operations = docs.flatMap(({ stream, doc }) => [{ create: { _index: stream } }, doc]);
  const response = await client.bulk({ operations, refresh: true });
  if (response.errors) {
    const first = response.items.find((i) => i.create && i.create.error);
    throw new Error(`Bulk errors: ${JSON.stringify(first.create.error)}`);
  }
  const byScenario = docs.reduce((acc, { doc }) => {
    const scenario = doc.tags[1];
    return { ...acc, [scenario]: (acc[scenario] || 0) + 1 };
  }, {});
  console.log(
    `Planted ${docs.length} docs in ${Object.keys(STREAMS).length} data streams`,
    byScenario
  );
};

const rowsOf = (response) =>
  response.values.map((row) =>
    Object.fromEntries(response.columns.map((column, i) => [column.name, row[i]]))
  );

const runEsql = (query, filter) =>
  client.esql.query({ query: `${query}\n| LIMIT 51`, filter, format: 'json' });

const BUCKET_MS = { '15m': 900_000, '1h': 3_600_000, '1d': 86_400_000 };

/**
 * Each hunt must return these planted keys; `absent` keys are noise the query must exclude. Keys are
 * the normalised values the TRADE queries produce: their GUID/number stripping also removes digit
 * runs such as the `64.` in `procdump64.exe` and the `32.` in `rundll32.exe`.
 */
const EXPECTATIONS = {
  rare_lsass_process_access: {
    present: [
      { process: 'c:\\program files\\acme backup\\acmebackup.exe' },
      { process: 'c:\\users\\public\\libraries\\procdumpexe' },
    ],
    absent: [{ process: 'c:\\windows\\system32\\svchost.exe' }],
  },
  rare_createremotethread_source_process: {
    present: [
      { source_process: 'C:\\Program Files\\Debugging Tools\\windbg.exe' },
      { source_process: 'C:\\users\\user\\AppData\\Local\\Temp\\update_svc.exe' },
    ],
    absent: [{ source_process: 'C:\\Windows\\System32\\csrss.exe' }],
  },
  linux_gtfobins_external_connections: {
    present: [
      { 'process.name': 'pip', 'destination.port': 443 },
      { 'process.name': 'bash', 'destination.port': 4444 },
    ],
    absent: [{ 'process.name': 'curl', 'destination.port': 443 }],
  },
  okta_failed_oauth_public_client_scope: {
    present: [
      { 'okta.actor.display_name': 'Internal Dev Portal' },
      { 'okta.actor.display_name': 'Totally Legit App' },
    ],
    absent: [{ 'okta.actor.display_name': 'Okta Browser Plugin' }],
  },
  aws_iam_cross_account_assume_role_creation: {
    present: [{ 'cloud.account.id': '111122223333' }, { 'cloud.account.id': '555566667777' }],
    absent: [],
  },
  okta_password_spraying_repeat_source: {
    present: [{ 'okta.client.ip': '185.220.101.4' }, { 'okta.client.ip': '203.0.113.5' }],
    absent: [{ 'okta.client.ip': '198.51.100.1' }],
  },
  linux_uncommon_exec_suspicious_directory: {
    present: [
      { 'process.executable': '/dev/shm/.x/kworker', parent_executable: '/bin/bash' },
      { 'process.executable': '/var/www/app/bin/migrate', parent_executable: '/usr/bin/sudo' },
    ],
    absent: [{ 'process.executable': '/tmp/4821937' }],
  },
  rare_rundll32_command_line: {
    present: [
      {
        cmdline: 'rundllexe C:\\users\\user\\AppData\\Roaming\\upd\\core.dll,Start',
        parent_name: 'winword.exe',
      },
      {
        cmdline: 'rundllexe "C:\\Vendor Tools\\upd.dll",CheckUpdates',
        parent_name: 'vendorupdater.exe',
      },
    ],
    absent: [{ cmdline: 'rundllexe vendorx.dll,Heartbeat' }],
  },
};

const matches = (row, key) => Object.entries(key).every(([k, v]) => String(row[k]) === String(v));

const verify = async () => {
  const failures = [];
  const filter = { range: { '@timestamp': { gte: 'now-7d', lte: 'now' } } };
  const files = fs
    .readdirSync(definitionsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const definition = JSON.parse(fs.readFileSync(path.join(definitionsDir, file), 'utf8'));
    const { id, query } = definition;
    const expectation = EXPECTATIONS[id];
    const fail = (message) => failures.push(`${id}: ${message}`);
    if (!expectation) {
      fail('no expectation defined');
      continue;
    }

    let candidates;
    try {
      candidates = rowsOf(await runEsql(query.query, filter));
    } catch (e) {
      fail(`candidate query failed: ${e.message.slice(0, 300)}`);
      continue;
    }
    for (const key of expectation.present) {
      if (!candidates.some((row) => matches(row, key))) {
        fail(`candidate rows are missing ${JSON.stringify(key)}`);
      }
    }
    for (const key of expectation.absent) {
      if (candidates.some((row) => matches(row, key))) {
        fail(`candidate rows include excluded noise ${JSON.stringify(key)}`);
      }
    }
    if (candidates.length > 50) {
      fail(`candidate rows exceed the 50 row cap (${candidates.length})`);
    }
    if (query.resultKind === 'raw_event') {
      for (const row of candidates) {
        if (!row._index || !row._id) fail('a raw event row has no _index/_id');
      }
    }

    let surroundingChecked = 0;
    for (const key of expectation.present) {
      const row = candidates.find((r) => matches(r, key));
      if (!row || !query.surroundingEventQuery) continue;
      const bucketMs = BUCKET_MS[query.occurrence.bucket];
      const bucketStart =
        Math.floor(new Date(row[query.occurrence.timeField]).getTime() / bucketMs) * bucketMs;
      const params = {
        bucket_start: new Date(bucketStart).toISOString(),
        bucket_end: new Date(bucketStart + bucketMs).toISOString(),
        group_id: 'v1:verify',
      };
      for (const field of query.occurrence.keyFields) {
        params[field] = row[field];
      }
      let surrounding;
      try {
        const bound = bindSurroundingQuery({
          query: query.surroundingEventQuery,
          keyFields: query.occurrence.keyFields,
          params,
        });
        surrounding = rowsOf(await runEsql(bound, undefined));
      } catch (e) {
        fail(`surrounding query for ${JSON.stringify(key)} failed: ${e.message.slice(0, 300)}`);
        continue;
      }
      if (surrounding.length === 0) {
        fail(`surrounding query for ${JSON.stringify(key)} returned no events`);
      } else if (surrounding.some((r) => !r._index || !r._id)) {
        fail(`surrounding events for ${JSON.stringify(key)} are missing _index/_id`);
      } else {
        surroundingChecked++;
      }
    }
    console.log(
      `${failures.some((f) => f.startsWith(`${id}:`)) ? 'FAIL' : 'ok  '}  ${id}  candidates=${
        candidates.length
      }  surrounding checked=${surroundingChecked}`
    );
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('\nAll planted scenarios verified.');
};

const main = async () => {
  if (command === 'plant') await plant();
  if (command === 'verify') await verify();
  if (command === 'clean') {
    await clean();
    console.log('Removed hunt-library plant data streams and templates');
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
