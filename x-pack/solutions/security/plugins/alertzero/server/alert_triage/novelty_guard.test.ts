/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NOVELTY_FIELD,
  NOVELTY_SOURCE_FIELDS,
  checkNovelty,
  commandLineShape,
  guardHitTag,
  noveltyValuesOf,
} from './novelty_guard';
import { VERDICT_CACHE_NOVELTY_CAP } from './verdict_cache';

const ENCODED = 'JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAAgAFMAeQBzAHQAZQBtAC4ATgBlAHQA';

const processDoc = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  host: { os: { type: 'windows' }, name: 'host-1' },
  user: { name: 'alice' },
  process: {
    executable: 'C:\\Tools\\agent.exe',
    command_line: 'agent.exe -file "C:\\Tools\\run.ps1" --retries 3',
    hash: { sha256: 'AABB' },
    code_signature: { subject_name: 'Acme', trusted: true },
    parent: { executable: 'C:\\Windows\\explorer.exe' },
  },
  ...overrides,
});

const listsOf = (doc: Record<string, unknown>, kind: Parameters<typeof noveltyValuesOf>[1]) =>
  noveltyValuesOf(doc, kind);

describe('commandLineShape', () => {
  it('turns an encoded PowerShell command into a shape that a plain script call does not have', () => {
    expect(commandLineShape(`powershell.exe -enc ${ENCODED}`)).toBe('powershell.exe -enc <b64>');
    expect(commandLineShape('powershell.exe -file "C:\\a\\b.ps1"')).toBe(
      'powershell.exe -file <q>'
    );
  });

  it('reads Base64 before it lower cases, because lower casing takes the mixed case away', () => {
    expect(commandLineShape(`x ${ENCODED}`)).toContain('<b64>');
  });

  it('keeps a long plain word, because it has no digits', () => {
    expect(commandLineShape('MicrosoftEdgeUpdateSetup.exe /silent')).toBe(
      'microsoftedgeupdatesetup.exe /silent'
    );
  });

  it('replaces the values that change from run to run: profile, temp path, GUID, hex string, quoted text and numbers', () => {
    expect(commandLineShape('tool c:\\users\\bob\\app\\x.dll')).toBe(
      'tool c:\\users\\<user>\\app\\x.dll'
    );
    expect(commandLineShape('tool /home/bob/x')).toBe('tool /home/<user>/x');
    expect(commandLineShape('tool C:\\Users\\bob\\AppData\\Local\\Temp\\a.tmp')).toBe('tool <tmp>');
    expect(commandLineShape('tool /tmp/abc')).toBe('tool <tmp>');
    expect(commandLineShape('tool {123e4567-e89b-12d3-a456-426614174000}')).toBe('tool <guid>');
    expect(commandLineShape('tool deadbeef01 beef')).toBe('tool <hex> beef');
    expect(commandLineShape('tool \'a b\' "c" --n 42')).toBe('tool <q> <q> --n <n>');
  });

  it('collapses spaces', () => {
    expect(commandLineShape('  a   b  ')).toBe('a b');
  });

  it('does not tell two scripts apart when the switches are the same, which the report must show as a miss', () => {
    expect(commandLineShape('powershell.exe -file "C:\\a.ps1"')).toBe(
      commandLineShape('powershell.exe -file "C:\\evil.ps1"')
    );
  });
});

describe('noveltyValuesOf', () => {
  it('reads the fields by the kind of the key, with a lower cased hash and a hashed shape that holds no command text', () => {
    const values = noveltyValuesOf(processDoc(), 'process');

    expect(values[NOVELTY_FIELD.hash]).toEqual(['aabb']);
    expect(values[NOVELTY_FIELD.trusted]).toEqual(['true']);
    expect(values[NOVELTY_FIELD.user]).toEqual(['alice']);
    expect(values[NOVELTY_FIELD.host]).toEqual(['host-1']);
    const [shape] = values[NOVELTY_FIELD.commandLine];
    expect(shape).toMatch(/^[0-9a-f]{16}$/);
  });

  it('leaves the parent out for a process key, because the key holds it, and normalizes it for the other kinds', () => {
    expect(noveltyValuesOf(processDoc(), 'process')[NOVELTY_FIELD.parent]).toBeUndefined();
    expect(noveltyValuesOf(processDoc(), 'file')[NOVELTY_FIELD.parent]).toEqual([
      'c:\\windows\\explorer.exe',
    ]);
  });

  it('takes the hash and the signature of a library from the dll fields, and of a file from the file hash', () => {
    const library = noveltyValuesOf(
      { dll: { hash: { sha256: 'CC' }, code_signature: { trusted: false } } },
      'library'
    );
    expect(library[NOVELTY_FIELD.hash]).toEqual(['cc']);
    expect(library[NOVELTY_FIELD.trusted]).toEqual(['false']);
    expect(
      noveltyValuesOf({ file: { hash: { sha256: 'DD' } } }, 'file')[NOVELTY_FIELD.hash]
    ).toEqual(['dd']);
  });

  it('gives a cloud alert only the destination, user and host', () => {
    const values = noveltyValuesOf(
      { ...processDoc(), destination: { ip: '10.0.0.1', domain: 'Example.COM' } },
      'cloud'
    );

    expect(Object.keys(values).sort()).toEqual(
      ['destination.domain', 'destination.ip', 'host.name', 'user.name'].sort()
    );
    expect(values[NOVELTY_FIELD.destinationDomain]).toEqual(['example.com']);
  });

  it('leaves out a field that the alert does not have', () => {
    expect(noveltyValuesOf({ process: { executable: 'a' } }, 'process')).toEqual({});
  });

  it('reads flat dotted fields like the key does', () => {
    expect(noveltyValuesOf({ 'process.hash.sha256': 'EE' }, 'process')[NOVELTY_FIELD.hash]).toEqual(
      ['ee']
    );
  });

  it('lists every field it reads once, so that a search fetches them', () => {
    expect(NOVELTY_SOURCE_FIELDS).toEqual(
      expect.arrayContaining(['process.command_line', 'destination.ip'])
    );
    expect(new Set(NOVELTY_SOURCE_FIELDS).size).toBe(NOVELTY_SOURCE_FIELDS.length);
  });
});

describe('checkNovelty', () => {
  const seen = listsOf(processDoc(), 'process');

  it('fires on nothing for an alert that has only seen values', () => {
    expect(checkNovelty({ lists: seen, values: seen })).toEqual({ fired: [], notChecked: [] });
  });

  it('fires on a new hash, a new trusted value and a new command line shape', () => {
    const variant = noveltyValuesOf(
      processDoc({
        process: {
          executable: 'C:\\Tools\\agent.exe',
          command_line: `agent.exe -enc ${ENCODED}`,
          hash: { sha256: 'FFFF' },
          code_signature: { subject_name: 'Acme', trusted: false },
        },
      }),
      'process'
    );

    expect(checkNovelty({ lists: seen, values: variant }).fired).toEqual([
      NOVELTY_FIELD.hash,
      NOVELTY_FIELD.trusted,
      NOVELTY_FIELD.commandLine,
    ]);
  });

  it('does not fire on a new host or a new user, because they are recorded only', () => {
    const elsewhere = noveltyValuesOf(
      processDoc({ host: { os: { type: 'windows' }, name: 'host-2' }, user: { name: 'bob' } }),
      'process'
    );

    expect(checkNovelty({ lists: seen, values: elsewhere })).toEqual({ fired: [], notChecked: [] });
  });

  it('fires on a destination that the key never saw, even when the record has no list for it', () => {
    const withDestination = noveltyValuesOf(
      processDoc({ destination: { ip: '203.0.113.9' } }),
      'process'
    );

    expect(checkNovelty({ lists: seen, values: withDestination }).fired).toEqual([
      NOVELTY_FIELD.destinationIp,
    ]);
  });

  it('does not fire on a field that the alert lacks, even when the record has a list for it', () => {
    expect(checkNovelty({ lists: seen, values: {} })).toEqual({ fired: [], notChecked: [] });
  });

  it('reports a full list as not checked and does not fire on it', () => {
    const full = Array.from({ length: VERDICT_CACHE_NOVELTY_CAP }, (_unused, i) => `h${i}`);

    const check = checkNovelty({
      lists: { ...seen, [NOVELTY_FIELD.hash]: full },
      values: { [NOVELTY_FIELD.hash]: ['new'] },
    });

    expect(check).toEqual({ fired: [], notChecked: [NOVELTY_FIELD.hash] });
  });

  it('still checks a list that is one under the cap', () => {
    const almost = Array.from({ length: VERDICT_CACHE_NOVELTY_CAP - 1 }, (_unused, i) => `h${i}`);

    expect(
      checkNovelty({
        lists: { [NOVELTY_FIELD.hash]: almost },
        values: { [NOVELTY_FIELD.hash]: ['new'] },
      }).fired
    ).toEqual([NOVELTY_FIELD.hash]);
  });
});

describe('guardHitTag', () => {
  it('names the guard and the field', () => {
    expect(guardHitTag('novelty', 'hash')).toBe('az:guard_hit:novelty:hash');
  });
});
