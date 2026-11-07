/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'crypto';
import { constants } from 'fs';
import { lstat, mkdir, open } from 'fs/promises';
import { hostname, userInfo } from 'os';
import { basename, dirname, isAbsolute, join, parse, resolve, sep } from 'path';
import { parseArgs } from 'util';
import type {
  SecurityActivityEvent,
  SecurityAgentProvider,
  SecurityPolicyControl,
} from '../../common/entity_intelligence/security_events';
import { securityEventsIndex } from '../../common/entity_intelligence/security_events';

export const SECURITY_EXERCISE_ENGINE = 'Local exercise policy gateway';
export const SECURITY_EXERCISE_POLICY_ID = 'entity-intelligence-fixture-boundary';
const FIXTURE_CONTENT =
  'Entity Intelligence inert exercise fixture. No credentials or user data.\n';
const PUBLIC_CONTENT = 'Entity Intelligence public exercise fixture.\n';

export type ExerciseAction =
  | 'read_public_fixture'
  | 'read_protected_fixture'
  | 'export_protected_fixture';

export interface SecurityExerciseOptions {
  sandboxDirectory: string;
  spaceId: string;
  agent: { id: string; provider: SecurityAgentProvider; sessionId?: string };
  scenarioId?: string;
  outputFile?: string;
  action?: ExerciseAction;
  mode?: SecurityPolicyControl['mode'];
  requestId?: string;
}

export interface SecurityExerciseResult {
  scenarioId: string;
  events: SecurityActivityEvent[];
  sandboxDirectory: string;
  sinkFile: string;
}

const POLICY_DEFINITION: NonNullable<SecurityPolicyControl['definition']> = {
  description:
    'Protect the gateway-owned inert fixture from reads and exports while permitting the public fixture.',
  scope:
    'Only newly created files inside this local gateway sandbox; the export destination is its local sink.',
  clauses: [
    {
      id: 'public-read',
      name: 'Allow public fixture reads',
      condition: 'operation = read AND resource.classification = public_fixture',
      expected: 'allow',
    },
    {
      id: 'protected-read',
      name: 'Deny protected fixture reads',
      condition: 'operation = read AND resource.classification = protected_fixture',
      expected: 'deny',
    },
    {
      id: 'protected-export',
      name: 'Deny protected fixture export',
      condition:
        'operation = export AND resource.classification = protected_fixture AND destination = local_sink',
      expected: 'deny',
    },
  ],
};

/** Evaluates the requested operation and fixture classification before performing any protected I/O. */
export const evaluateSecurityPolicy = (
  action: ExerciseAction,
  mode: SecurityPolicyControl['mode']
): SecurityPolicyControl => {
  const clauseId =
    action === 'read_public_fixture'
      ? 'public-read'
      : action === 'read_protected_fixture'
      ? 'protected-read'
      : 'protected-export';
  const clause = POLICY_DEFINITION.clauses.find(({ id }) => id === clauseId);
  if (!clause) throw new Error('No fixture policy clause matched the requested operation.');
  const decision = clause.expected;
  return {
    id: SECURITY_EXERCISE_POLICY_ID,
    name: 'Protect local exercise fixtures',
    version: '2',
    engine: SECURITY_EXERCISE_ENGINE,
    mode,
    decision,
    outcome: decision === 'deny' && mode === 'enforce' ? 'blocked' : 'allowed',
    reason:
      action === 'read_public_fixture'
        ? 'Reading the public fixture is permitted.'
        : action === 'read_protected_fixture'
        ? 'The policy prohibits reading the protected fixture.'
        : 'The policy prohibits exporting the protected fixture to the local sink.',
    clause: { ...clause },
    policy_sha256: createHash('sha256').update(JSON.stringify(POLICY_DEFINITION)).digest('hex'),
    definition: {
      ...POLICY_DEFINITION,
      clauses: POLICY_DEFINITION.clauses.map((entry) => ({ ...entry })),
    },
  };
};

const identifier = (value: string): boolean => /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,255}$/.test(value);

const validateOptions = (options: SecurityExerciseOptions): void => {
  securityEventsIndex(options.spaceId);
  if (
    !identifier(options.agent.id) ||
    !['codex', 'cursor', 'agent_builder'].includes(options.agent.provider) ||
    (options.agent.sessionId !== undefined && !identifier(options.agent.sessionId)) ||
    (options.scenarioId !== undefined && !identifier(options.scenarioId))
  ) {
    throw new Error('Agent, session and scenario identifiers must be bounded identifiers.');
  }
  const hasSingleOperation =
    options.action !== undefined || options.mode !== undefined || options.requestId !== undefined;
  if (
    hasSingleOperation &&
    (!options.action ||
      !['read_public_fixture', 'read_protected_fixture', 'export_protected_fixture'].includes(
        options.action
      ) ||
      !options.mode ||
      !['enforce', 'monitor'].includes(options.mode) ||
      !options.requestId ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(options.requestId) ||
      !options.agent.sessionId)
  )
    throw new Error(
      'A single operation requires an action, mode, UUID request ID and recorded session ID.'
    );
  const sandbox = options.sandboxDirectory;
  if (
    !isAbsolute(sandbox) ||
    sandbox.length > 1024 ||
    sandbox.includes('\0') ||
    sandbox !== resolve(sandbox) ||
    sandbox === parse(sandbox).root
  ) {
    throw new Error('Use a normalized absolute path for a new exercise sandbox directory.');
  }
  if (
    options.outputFile !== undefined &&
    (options.outputFile.length > 1280 ||
      dirname(options.outputFile) !== sandbox ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}\.ndjson$/.test(basename(options.outputFile)))
  ) {
    throw new Error('The output must be a new .ndjson file directly inside the exercise sandbox.');
  }
};

const verifyParentDirectories = async (directory: string): Promise<void> => {
  const root = parse(directory).root;
  let current = root;
  for (const part of directory.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error('Exercise paths must have existing directory ancestors without symlinks.');
    }
  }
};

interface FixtureIdentity {
  device: number;
  inode: number;
}

const writeNewFile = async (path: string, content: string): Promise<FixtureIdentity> => {
  await verifyParentDirectories(dirname(path));
  const file = await open(
    path,
    constants.O_WRONLY + constants.O_CREAT + constants.O_EXCL + constants.O_NOFOLLOW,
    0o600
  );
  try {
    await file.writeFile(content, 'utf8');
    const info = await file.stat();
    return { device: info.dev, inode: info.ino };
  } finally {
    await file.close();
  }
};

const readOwnFixture = async (
  path: string,
  expected: string,
  identity: FixtureIdentity
): Promise<string> => {
  await verifyParentDirectories(dirname(path));
  const file = await open(path, constants.O_RDONLY + constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (
      !info.isFile() ||
      info.nlink !== 1 ||
      info.dev !== identity.device ||
      info.ino !== identity.inode ||
      info.size !== Buffer.byteLength(expected)
    ) {
      throw new Error('The exercise fixture no longer matches its own inert data.');
    }
    const buffer = Buffer.alloc(Buffer.byteLength(expected));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    const contents = buffer.toString('utf8');
    if (bytesRead !== buffer.length || contents !== expected)
      throw new Error('The exercise fixture was modified.');
    return contents;
  } finally {
    await file.close();
  }
};

/** Runs explicit policy decisions using newly created inert fixtures and a local-only sink. */
export const runSecurityPolicyExercise = async (
  options: SecurityExerciseOptions
): Promise<SecurityExerciseResult> => {
  validateOptions(options);
  await verifyParentDirectories(dirname(options.sandboxDirectory));
  const account = userInfo();
  const hostName = hostname();
  if (
    !Number.isSafeInteger(account.uid) ||
    account.uid < 0 ||
    !/^[\p{L}\p{N}_.@-]{1,128}$/u.test(account.username) ||
    !/^[a-zA-Z0-9_.-]{1,255}$/.test(hostName)
  ) {
    throw new Error('The local OS identity cannot be represented safely.');
  }
  await mkdir(options.sandboxDirectory, { mode: 0o700 });
  const publicDirectory = join(options.sandboxDirectory, 'public');
  const protectedDirectory = join(options.sandboxDirectory, 'protected');
  const sinkDirectory = join(options.sandboxDirectory, 'sink');
  for (const directory of [publicDirectory, protectedDirectory, sinkDirectory]) {
    await mkdir(directory, { mode: 0o700 });
  }
  const publicFile = join(publicDirectory, 'public_fixture.txt');
  const protectedFile = join(protectedDirectory, 'inert_fixture.txt');
  const sinkFile = join(sinkDirectory, 'monitored_fixture.txt');
  const publicIdentity = await writeNewFile(publicFile, PUBLIC_CONTENT);
  const protectedIdentity = await writeNewFile(protectedFile, FIXTURE_CONTENT);
  const scenarioId = options.scenarioId ?? `security-exercise-${randomUUID()}`;
  const hostId = `local-host:${createHash('sha256').update(hostName).digest('hex')}`;
  const userId = `local-os:${createHash('sha256')
    .update(`${hostName}:${account.uid}`)
    .digest('hex')}`;
  const agentName = { codex: 'Codex', cursor: 'Cursor', agent_builder: 'Agent Builder' }[
    options.agent.provider
  ];
  const events: SecurityActivityEvent[] = [];
  const steps: Array<{ action: ExerciseAction; mode: SecurityPolicyControl['mode'] }> =
    options.action && options.mode
      ? [{ action: options.action, mode: options.mode }]
      : [
          { action: 'read_public_fixture', mode: 'enforce' },
          { action: 'read_protected_fixture', mode: 'enforce' },
          { action: 'export_protected_fixture', mode: 'enforce' },
          { action: 'export_protected_fixture', mode: 'monitor' },
        ];
  for (const [index, { action, mode }] of steps.entries()) {
    const control = evaluateSecurityPolicy(action, mode);
    if (control.outcome === 'allowed') {
      if (action === 'read_public_fixture') {
        await readOwnFixture(publicFile, PUBLIC_CONTENT, publicIdentity);
      } else {
        const contents = await readOwnFixture(protectedFile, FIXTURE_CONTENT, protectedIdentity);
        if (action === 'export_protected_fixture') await writeNewFile(sinkFile, contents);
      }
    }
    const isExport = action === 'export_protected_fixture';
    events.push({
      '@timestamp': new Date().toISOString(),
      event: {
        id: randomUUID(),
        kind: 'event',
        dataset: 'entity_intelligence.security',
        action,
        category: ['file'],
        type: [control.outcome === 'blocked' ? 'denied' : 'allowed'],
        outcome: control.outcome === 'blocked' ? 'failure' : 'success',
      },
      user: { id: userId, name: account.username },
      host: { id: hostId, name: hostName },
      agent: { id: options.agent.id, name: agentName, type: options.agent.provider },
      ...(options.agent.sessionId ? { session: { id: options.agent.sessionId } } : {}),
      kibana: { space_id: options.spaceId },
      entity_intelligence: {
        schema_version: 1,
        ...(options.requestId ? { request_id: options.requestId } : {}),
        actor_provenance: 'local_os_account',
        agent: {
          id: options.agent.id,
          provider: options.agent.provider,
          name: agentName,
          ...(options.agent.sessionId ? { session_id: options.agent.sessionId } : {}),
        },
        activity: {
          type: isExport ? 'unapproved_export' : 'protected_file_access',
          target: options.action
            ? isExport
              ? sinkFile
              : action === 'read_public_fixture'
              ? publicFile
              : protectedFile
            : isExport
            ? 'local exercise sink'
            : action === 'read_public_fixture'
            ? 'public exercise fixture'
            : 'protected exercise fixture',
        },
        control,
        scenario: { id: scenarioId, step: index + 1, kind: 'controlled' },
      },
    });
  }
  if (options.outputFile) {
    await writeNewFile(
      options.outputFile,
      `${events.map((event) => JSON.stringify(event)).join('\n')}\n`
    );
  }
  return { scenarioId, events, sandboxDirectory: options.sandboxDirectory, sinkFile };
};

/** Parses explicit local exercise options without importing or changing agent configuration. */
export const runSecurityPolicyGatewayCli = async (args: readonly string[]): Promise<void> => {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    options: {
      sandbox: { type: 'string' },
      'space-id': { type: 'string', default: 'default' },
      provider: { type: 'string' },
      'agent-id': { type: 'string' },
      'session-id': { type: 'string' },
      'scenario-id': { type: 'string' },
      output: { type: 'string' },
      action: { type: 'string' },
      mode: { type: 'string' },
      'request-id': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    process.stdout.write(
      'Run four fixture-only policy decisions. Required: --sandbox <new absolute directory> --provider codex|cursor|agent_builder --agent-id <recorded installation ID>. Optional: --session-id <recorded session ID> --scenario-id <ID> --space-id <space> --output <sandbox/file.ndjson>. Without --output, events are written to stdout. Single-operation mode: --action read_public_fixture|read_protected_fixture|export_protected_fixture --mode enforce|monitor --request-id <UUID> --session-id <recorded session>. A blocked operation exits 77; an allowed operation exits 0. No network operations are performed.\n'
    );
    return;
  }
  const provider = values.provider;
  if (
    !values.sandbox ||
    !values['agent-id'] ||
    (provider !== 'codex' && provider !== 'cursor' && provider !== 'agent_builder')
  ) {
    throw new Error(
      'Supply --sandbox, --provider and --agent-id. Use --help for the local exercise contract.'
    );
  }
  const action = values.action;
  const mode = values.mode;
  if (
    action !== undefined &&
    action !== 'read_public_fixture' &&
    action !== 'read_protected_fixture' &&
    action !== 'export_protected_fixture'
  )
    throw new Error('Invalid gateway action.');
  if (mode !== undefined && mode !== 'enforce' && mode !== 'monitor')
    throw new Error('Invalid gateway mode.');
  const result = await runSecurityPolicyExercise({
    sandboxDirectory: values.sandbox,
    spaceId: values['space-id'] ?? 'default',
    agent: { id: values['agent-id'], provider, sessionId: values['session-id'] },
    scenarioId: values['scenario-id'],
    outputFile: values.output,
    action,
    mode,
    requestId: values['request-id'],
  });
  if (action && values.output) {
    const event = result.events[0];
    process.stdout.write(
      `${JSON.stringify({
        request_id: event.entity_intelligence.request_id,
        action,
        target: event.entity_intelligence.activity.target,
        policy: event.entity_intelligence.control,
        evidence_file: values.output,
      })}\n`
    );
  }
  if (action && result.events[0].entity_intelligence.control?.outcome === 'blocked')
    process.exitCode = 77;
  if (!values.output) {
    process.stdout.write(`${result.events.map((event) => JSON.stringify(event)).join('\n')}\n`);
  }
};

if (require.main === module) {
  runSecurityPolicyGatewayCli(process.argv.slice(2)).catch(() => {
    process.stderr.write(
      'The local exercise could not complete. Check the explicit identifiers and new sandbox path; existing data is never reused.\n'
    );
    process.exitCode = 1;
  });
}
