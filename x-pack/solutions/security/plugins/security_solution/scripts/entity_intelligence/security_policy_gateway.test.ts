/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants } from 'fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'fs/promises';
import { tmpdir, userInfo, hostname } from 'os';
import { join } from 'path';
import { securityEventsIndex } from '../../common/entity_intelligence/security_events';
import {
  evaluateSecurityPolicy,
  runSecurityPolicyExercise,
  runSecurityPolicyGatewayCli,
  SECURITY_EXERCISE_ENGINE,
} from './security_policy_gateway';
import type { SecurityExerciseOptions } from './security_policy_gateway';

describe('security activity index', () => {
  it('uses an exact validated space name', () => {
    expect(securityEventsIndex('default')).toBe('logs-entity_intelligence.security-default');
    expect(securityEventsIndex('security-lab_2')).toBe(
      'logs-entity_intelligence.security-security-lab_2'
    );
  });

  it.each(['', '*', 'default,other', '../default', 'UPPERCASE', 'a'.repeat(65)])(
    'rejects unsafe or invalid space %s',
    (space) => expect(() => securityEventsIndex(space)).toThrow('Invalid space ID.')
  );
});

describe('fixture policy decisions', () => {
  it.each(['enforce', 'monitor'] as const)('allows the negative control in %s mode', (mode) => {
    expect(evaluateSecurityPolicy('read_public_fixture', mode)).toMatchObject({
      mode,
      decision: 'allow',
      outcome: 'allowed',
    });
  });

  it.each(['read_protected_fixture', 'export_protected_fixture'] as const)(
    'distinguishes denial from enforcement for %s',
    (action) => {
      expect(evaluateSecurityPolicy(action, 'enforce')).toMatchObject({
        decision: 'deny',
        outcome: 'blocked',
      });
      expect(evaluateSecurityPolicy(action, 'monitor')).toMatchObject({
        decision: 'deny',
        outcome: 'allowed',
      });
    }
  );
});

describe('local security policy exercise', () => {
  let parent: string;
  let options: SecurityExerciseOptions;

  beforeEach(async () => {
    parent = await mkdtemp(join(await realpath(tmpdir()), 'entity-security-gateway-'));
    options = {
      sandboxDirectory: join(parent, 'exercise'),
      spaceId: 'default',
      agent: {
        id: 'codex-recorded-installation',
        provider: 'codex',
        sessionId: 'recorded-session',
      },
      scenarioId: 'security-exercise-test',
    };
  });

  afterEach(async () => {
    process.exitCode = 0;
    await rm(parent, { recursive: true, force: true });
  });

  it('executes controls using only newly created inert fixtures and records truthful decisions', async () => {
    const result = await runSecurityPolicyExercise(options);
    expect(result.events).toHaveLength(4);
    expect(result.events.map((event) => event.entity_intelligence.control)).toEqual([
      expect.objectContaining({ mode: 'enforce', decision: 'allow', outcome: 'allowed' }),
      expect.objectContaining({ mode: 'enforce', decision: 'deny', outcome: 'blocked' }),
      expect.objectContaining({ mode: 'enforce', decision: 'deny', outcome: 'blocked' }),
      expect.objectContaining({ mode: 'monitor', decision: 'deny', outcome: 'allowed' }),
    ]);
    expect(result.events.map((event) => event.event.outcome)).toEqual([
      'success',
      'failure',
      'failure',
      'success',
    ]);
    expect(result.events.map((event) => event.event.type)).toEqual([
      ['allowed'],
      ['denied'],
      ['denied'],
      ['allowed'],
    ]);
    expect(await readdir(join(result.sandboxDirectory, 'sink'))).toEqual(['monitored_fixture.txt']);
    expect(await readFile(result.sinkFile, 'utf8')).toBe(
      'Entity Intelligence inert exercise fixture. No credentials or user data.\n'
    );
    expect((await lstat(result.sandboxDirectory)).mode % 0o1000).toBe(0o700);
    expect((await lstat(result.sinkFile)).mode % 0o1000).toBe(0o600);
    for (const [index, event] of result.events.entries()) {
      expect(event).toMatchObject({
        event: { kind: 'event', dataset: 'entity_intelligence.security', category: ['file'] },
        user: { name: userInfo().username },
        host: { name: hostname() },
        agent: { id: options.agent.id, name: 'Codex', type: 'codex' },
        session: { id: options.agent.sessionId },
        kibana: { space_id: 'default' },
        entity_intelligence: {
          schema_version: 1,
          actor_provenance: 'local_os_account',
          control: { engine: SECURITY_EXERCISE_ENGINE },
          agent: { id: options.agent.id, provider: 'codex', session_id: options.agent.sessionId },
          scenario: { id: options.scenarioId, step: index + 1, kind: 'controlled' },
        },
      });
      expect(event.user.id).toMatch(/^local-os:[a-f0-9]{64}$/);
      expect(event.host.id).toMatch(/^local-host:[a-f0-9]{64}$/);
      expect(event['@timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    expect(new Set(result.events.map((event) => event.event.id)).size).toBe(4);
  });

  it.each(['read_protected_fixture', 'export_protected_fixture'] as const)(
    'performs only the requested %s operation in monitor mode',
    async (action) => {
      const result = await runSecurityPolicyExercise({
        ...options,
        action,
        mode: 'monitor',
        requestId: '2ad4ccf1-6171-400a-9df7-6e6507b1fe82',
      });
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        event: { action, outcome: 'success' },
        entity_intelligence: { control: { mode: 'monitor', decision: 'deny', outcome: 'allowed' } },
      });
      if (action === 'read_protected_fixture') {
        expect(await readdir(join(result.sandboxDirectory, 'sink'))).toEqual([]);
        await expect(lstat(result.sinkFile)).rejects.toMatchObject({ code: 'ENOENT' });
      } else {
        expect(await readdir(join(result.sandboxDirectory, 'sink'))).toEqual([
          'monitored_fixture.txt',
        ]);
        expect(await readFile(result.sinkFile, 'utf8')).toBe(
          'Entity Intelligence inert exercise fixture. No credentials or user data.\n'
        );
      }
    }
  );

  it('reads the protected fixture only once for the explicit monitor operation', async () => {
    const filesystem = jest.requireActual<typeof import('fs/promises')>('fs/promises');
    const openFile = jest.spyOn(filesystem, 'open');
    try {
      await runSecurityPolicyExercise(options);
      const protectedReads = openFile.mock.calls.filter(
        ([path, flags]) =>
          path === join(options.sandboxDirectory, 'protected', 'inert_fixture.txt') &&
          flags === constants.O_RDONLY + constants.O_NOFOLLOW
      );
      expect(protectedReads).toHaveLength(1);
    } finally {
      openFile.mockRestore();
    }
  });

  it.each([
    ['read_public_fixture', 'enforce', 0, 'public-read'],
    ['read_protected_fixture', 'enforce', 77, 'protected-read'],
    ['export_protected_fixture', 'enforce', 77, 'protected-export'],
  ] as const)(
    'executes exactly one %s request and returns its real policy outcome',
    async (action, mode, exitCode, clauseId) => {
      const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const outputFile = join(options.sandboxDirectory, 'request.ndjson');
      try {
        await runSecurityPolicyGatewayCli([
          '--sandbox',
          options.sandboxDirectory,
          '--provider',
          'codex',
          '--agent-id',
          options.agent.id,
          '--session-id',
          'recorded-session',
          '--action',
          action,
          '--mode',
          mode,
          '--request-id',
          '2ad4ccf1-6171-400a-9df7-6e6507b1fe82',
          '--output',
          outputFile,
        ]);
        expect(process.exitCode ?? 0).toBe(exitCode);
        const records = (await readFile(outputFile, 'utf8'))
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line));
        expect(records).toHaveLength(1);
        expect(records[0].entity_intelligence).toMatchObject({
          request_id: '2ad4ccf1-6171-400a-9df7-6e6507b1fe82',
          control: {
            version: '2',
            clause: { id: clauseId },
            definition: { clauses: expect.any(Array) },
            policy_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          },
        });
        expect(records[0].entity_intelligence).not.toHaveProperty('invocation');
        expect(await readdir(join(options.sandboxDirectory, 'sink'))).toEqual([]);
        expect(stdout).toHaveBeenCalledWith(expect.stringContaining(clauseId));
      } finally {
        stdout.mockRestore();
      }
    }
  );

  it('rejects incomplete single-operation metadata before creating fixtures', async () => {
    await expect(
      runSecurityPolicyExercise({ ...options, action: 'read_protected_fixture' })
    ).rejects.toThrow('single operation requires');
    await expect(
      runSecurityPolicyExercise({
        ...options,
        action: 'read_protected_fixture',
        mode: 'enforce',
        requestId: 'not-a-uuid',
      })
    ).rejects.toThrow('single operation requires');
    expect(await readdir(parent)).toEqual([]);
  });

  it('writes NDJSON only to a new output file in its sandbox', async () => {
    const outputFile = join(options.sandboxDirectory, 'security_events.ndjson');
    const result = await runSecurityPolicyExercise({ ...options, outputFile });
    const lines = (await readFile(outputFile, 'utf8')).trim().split('\n');
    expect(lines.map((line) => JSON.parse(line))).toEqual(result.events);
    expect((await lstat(outputFile)).mode % 0o1000).toBe(0o600);
  });

  it('does not invent a session ID when none is supplied', async () => {
    const result = await runSecurityPolicyExercise({
      ...options,
      agent: { id: 'cursor-one', provider: 'cursor' },
    });
    expect(result.events[0].agent).toEqual({ id: 'cursor-one', name: 'Cursor', type: 'cursor' });
    expect(result.events[0]).not.toHaveProperty('session');
    expect(result.events[0].entity_intelligence.agent).not.toHaveProperty('session_id');
  });

  it('refuses existing directories without reading or altering their files', async () => {
    await mkdir(options.sandboxDirectory);
    const existing = join(options.sandboxDirectory, 'unrelated.txt');
    await writeFile(existing, 'existing user file');
    await expect(runSecurityPolicyExercise(options)).rejects.toThrow();
    expect(await readFile(existing, 'utf8')).toBe('existing user file');
    expect(await readdir(options.sandboxDirectory)).toEqual(['unrelated.txt']);
  });

  it('refuses a sandbox symlink', async () => {
    const target = join(parent, 'outside');
    await mkdir(target);
    await symlink(target, options.sandboxDirectory);
    await expect(runSecurityPolicyExercise(options)).rejects.toThrow();
    expect(await readdir(target)).toEqual([]);
  });

  it('refuses symlink ancestors before creating fixtures', async () => {
    const target = join(parent, 'outside');
    const link = join(parent, 'linked');
    await mkdir(target);
    await symlink(target, link);
    await expect(
      runSecurityPolicyExercise({ ...options, sandboxDirectory: join(link, 'exercise') })
    ).rejects.toThrow('without symlinks');
    expect(await readdir(target)).toEqual([]);
  });

  it.each(['relative/exercise', '/', '/private/tmp/../exercise', '/private/tmp/exercise/'])(
    'refuses unnormalized or unsafe sandbox %s',
    async (sandboxDirectory) => {
      await expect(runSecurityPolicyExercise({ ...options, sandboxDirectory })).rejects.toThrow(
        'normalized absolute path'
      );
      expect(await readdir(parent)).toEqual([]);
    }
  );

  it.each(['other.txt', '../outside.ndjson', 'public/fixture.ndjson', 'bad\nname.ndjson'])(
    'refuses unsafe output %s before creating a sandbox',
    async (name) => {
      await expect(
        runSecurityPolicyExercise({ ...options, outputFile: `${options.sandboxDirectory}/${name}` })
      ).rejects.toThrow('new .ndjson file');
      expect(await readdir(parent)).toEqual([]);
    }
  );

  it('rejects oversized or invalid explicit metadata before creating a sandbox', async () => {
    await expect(
      runSecurityPolicyExercise({ ...options, agent: { ...options.agent, id: 'x'.repeat(257) } })
    ).rejects.toThrow('bounded identifiers');
    await expect(
      runSecurityPolicyExercise({ ...options, scenarioId: 'wrong\nvalue' })
    ).rejects.toThrow('bounded identifiers');
    await expect(runSecurityPolicyExercise({ ...options, spaceId: '*' })).rejects.toThrow(
      'Invalid space ID'
    );
    expect(await readdir(parent)).toEqual([]);
  });

  it('requires explicit agent and sandbox context from CLI callers', async () => {
    await expect(runSecurityPolicyGatewayCli([])).rejects.toThrow('Supply --sandbox');
    await expect(
      runSecurityPolicyGatewayCli([
        '--sandbox',
        options.sandboxDirectory,
        '--provider',
        'other',
        '--agent-id',
        'agent',
      ])
    ).rejects.toThrow('Supply --sandbox');
    expect(await readdir(parent)).toEqual([]);
  });
});
