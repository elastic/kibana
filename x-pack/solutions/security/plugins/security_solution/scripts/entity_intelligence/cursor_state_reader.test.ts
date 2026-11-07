/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCursorState } from './cursor_state_reader';

let directory: string;
let path: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'cursor-reader-test-'));
  path = join(directory, 'state.vscdb');
  const database = new DatabaseSync(path);
  database.exec(
    'CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB); CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value BLOB); CREATE TABLE composerHeaders (composerId TEXT PRIMARY KEY, createdAt INTEGER, lastUpdatedAt INTEGER, isSubagent INTEGER, value TEXT)'
  );
  database.prepare('INSERT INTO ItemTable VALUES (?, ?)').run('auth', 'AUTH_SENTINEL_DO_NOT_READ');
  database
    .prepare('INSERT INTO composerHeaders VALUES (?, ?, ?, ?, ?)')
    .run(
      'session-one',
      1000,
      3000,
      0,
      JSON.stringify({ composerId: 'session-one', name: 'Recorded title' })
    );
  const insert = database.prepare('INSERT INTO cursorDiskKV VALUES (?, ?)');
  insert.run(
    'composerData:session-one',
    JSON.stringify({
      composerId: 'session-one',
      fullConversationHeadersOnly: [
        { bubbleId: 'one' },
        { bubbleId: 'two' },
        { bubbleId: 'missing' },
      ],
    })
  );
  insert.run(
    'bubbleId:session-one:one',
    JSON.stringify({
      bubbleId: 'one',
      type: 1,
      createdAt: '2026-10-12T10:01:00Z',
      text: 'Recorded user prompt',
    })
  );
  insert.run(
    'bubbleId:session-one:two',
    JSON.stringify({
      bubbleId: 'two',
      type: 2,
      createdAt: '2026-10-12T10:02:00Z',
      text: 'ASSISTANT_SENTINEL',
      thinking: 'THINKING_SENTINEL',
      toolFormerData: { name: 'read_file_v2', params: '{"path":"src/index.ts"}' },
    })
  );
  database.close();
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

it('reads conversation records without modifying the source or exporting assistant/auth content', () => {
  const before = readFileSync(path);
  const result = readCursorState(path, 0);
  expect(result.sessions).toHaveLength(1);
  expect(result.sessions[0].header.name).toBe('Recorded title');
  expect(result.sessions[0].bubbles[0].text).toBe('Recorded user prompt');
  expect(result.sessions[0].bubbles[1].toolFormerData?.name).toBe('read_file_v2');
  expect(result.sessions[0].complete).toBe(false);
  expect(result.unavailableRecords).toBe(1);
  for (const sentinel of ['AUTH_SENTINEL', 'ASSISTANT_SENTINEL', 'THINKING_SENTINEL'])
    expect(JSON.stringify(result)).not.toContain(sentinel);
  expect(readFileSync(path)).toEqual(before);
});

it('marks capped records partial and respects the requested recent window', () => {
  const result = readCursorState(path, 0, 100, 2);
  expect(result.sessions[0].complete).toBe(false);
  expect(result.sessions[0].bubbles.map((item) => item.bubbleId)).toEqual(['two']);
  expect(readCursorState(path, 4000).sessions).toEqual([]);
});

it('rejects malformed SQLite row types while preserving nullable source dates', () => {
  const database = new DatabaseSync(path);
  database.prepare('UPDATE composerHeaders SET createdAt = ?').run('not-a-number');
  expect(readCursorState(path, 0)).toMatchObject({ sessions: [], unavailableRecords: 1 });
  database.prepare('UPDATE composerHeaders SET createdAt = NULL').run();
  database.close();
  const result = readCursorState(path, 0);
  expect(result.sessions).toHaveLength(1);
  expect(result.sessions[0].header.createdAt).toBeUndefined();
  expect(result.sessions[0].bubbles).toHaveLength(2);
});
