/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPatternKeys } from './pattern_key';

const RULE = { 'kibana.alert.rule.uuid': 'rule-1', 'kibana.alert.rule.revision': 1 };
const WINDOWS = { host: { os: { type: 'windows' } } };

const processAlert = (executable: string, extra: Record<string, unknown> = {}) => ({
  ...RULE,
  ...WINDOWS,
  process: { executable, code_signature: { subject_name: 'Acme' } },
  ...extra,
});

const strictOf = (doc: Record<string, unknown>) => buildPatternKeys(doc).strict;
const wideOf = (doc: Record<string, unknown>) => buildPatternKeys(doc).wide;

describe('buildPatternKeys', () => {
  describe('normalisers', () => {
    it.each([
      ['a Windows path ignores case', 'C:\\Tools\\A.EXE', 'c:\\tools\\a.exe', WINDOWS],
      [
        'a Windows user profile is one value',
        'C:\\Users\\Alice\\tool.exe',
        'C:\\Users\\Bob\\tool.exe',
        WINDOWS,
      ],
      [
        'a GUID in a Windows path is one value',
        'C:\\Data\\{3F2504E0-4F89-11D3-9A0C-0305E82C3301}\\t.exe',
        'C:\\Data\\{3F2504E0-4F89-11D3-9A0C-0305E82C9999}\\t.exe',
        WINDOWS,
      ],
      [
        'a macOS user folder is one value',
        '/Users/al/App/tool',
        '/Users/bo/App/tool',
        { host: { os: { type: 'macos' } } },
      ],
      [
        'a Linux home folder is one value',
        '/home/al/bin/tool',
        '/home/bo/bin/tool',
        { host: { os: { type: 'linux' } } },
      ],
    ])('%s', (_name, first, second, os) => {
      expect(strictOf({ ...processAlert(first), ...os })).toBe(
        strictOf({ ...processAlert(second), ...os })
      );
    });

    it.each([
      [
        'a Linux path keeps its case',
        '/opt/Tool',
        '/opt/tool',
        { host: { os: { type: 'linux' } } },
      ],
      [
        'a system folder stays exact',
        '/usr/bin/a',
        '/usr/bin/b',
        { host: { os: { type: 'linux' } } },
      ],
      [
        'a Windows path is exact when the OS is unknown',
        'C:\\Users\\A\\x.exe',
        'C:\\Users\\B\\x.exe',
        {},
      ],
    ])('keeps what it must not merge: %s', (_name, first, second, os) => {
      expect(strictOf({ ...processAlert(first), host: undefined, ...os })).not.toBe(
        strictOf({ ...processAlert(second), host: undefined, ...os })
      );
    });

    it('lowercases a hash', () => {
      const doc = (hash: string) => ({
        ...RULE,
        ...WINDOWS,
        process: { executable: 'C:\\t.exe', hash: { sha256: hash } },
      });
      expect(strictOf(doc('ABCD'))).toBe(strictOf(doc('abcd')));
      expect(strictOf(doc('abcd'))).not.toBe(strictOf(doc('abce')));
    });

    it.each([
      ['hive names', 'HKEY_LOCAL_MACHINE\\Software\\V\\K', 'HKLM\\Software\\V\\K'],
      ['hive names and case', 'hkey_users\\.DEFAULT\\K', 'HKU\\.default\\k'],
      [
        'GUIDs',
        'HKLM\\Software\\Tasks\\{F4D0D1B4-AEF6-44B5-B708-0B27EDBE475D}\\Info',
        'HKLM\\Software\\Tasks\\{EC2A03E8-2F81-4030-A3A7-53DAC1DB0E2D}\\Info',
      ],
      [
        'SIDs',
        'HKEY_USERS\\S-1-5-21-1111-2222-3333-1001\\Software\\K',
        'HKU\\S-1-5-21-9999-8888-7777-1002\\Software\\K',
      ],
    ])('registry paths ignore %s', (_name, first, second) => {
      const doc = (path: string) => ({
        ...RULE,
        ...WINDOWS,
        event: { category: ['registry'] },
        registry: { path },
        process: { executable: 'C:\\t.exe' },
      });
      expect(strictOf(doc(first))).toBe(strictOf(doc(second)));
    });
  });

  describe('field sets', () => {
    it('keeps the signer, so one program from two vendors is two patterns', () => {
      const signed = (signer: string) =>
        processAlert('C:\\t.exe', {
          process: { executable: 'C:\\t.exe', code_signature: { subject_name: signer } },
        });
      expect(strictOf(signed('A'))).not.toBe(strictOf(signed('B')));
    });

    it('adds the hash only when there is no signer', () => {
      const withHash = (hash: string, signer?: string) => ({
        ...RULE,
        ...WINDOWS,
        process: {
          executable: 'C:\\t.exe',
          hash: { sha256: hash },
          ...(signer ? { code_signature: { subject_name: signer } } : {}),
        },
      });
      expect(strictOf(withHash('aa', 'Acme'))).toBe(strictOf(withHash('bb', 'Acme')));
      expect(strictOf(withHash('aa'))).not.toBe(strictOf(withHash('bb')));
    });

    it('keeps the parent executable in both keys', () => {
      const withParent = (parent: string) =>
        processAlert('C:\\t.exe', {
          process: {
            executable: 'C:\\t.exe',
            code_signature: { subject_name: 'Acme' },
            parent: { executable: parent },
          },
        });
      expect(strictOf(withParent('C:\\a.exe'))).not.toBe(strictOf(withParent('C:\\b.exe')));
      expect(wideOf(withParent('C:\\a.exe'))).not.toBe(wideOf(withParent('C:\\b.exe')));
    });

    it('picks the kind the event category names before the one the fields suggest', () => {
      const doc = {
        ...RULE,
        ...WINDOWS,
        event: { category: ['file'] },
        file: { path: 'C:\\d\\f.tmp' },
        process: { executable: 'C:\\t.exe' },
      };
      expect(JSON.parse(strictOf(doc) as string)[3]).toBe('file');
    });

    it('falls back to the field that is present when the category names no kind', () => {
      const doc = {
        ...RULE,
        ...WINDOWS,
        event: { category: ['malware'] },
        process: { executable: 'C:\\t.exe' },
      };
      expect(JSON.parse(strictOf(doc) as string)[3]).toBe('process');
    });
  });

  describe('the rule and the detection', () => {
    it.each([
      ['rule', { 'kibana.alert.rule.uuid': 'rule-2' }],
      ['rule revision', { 'kibana.alert.rule.revision': 2 }],
    ])('a different %s is a different pattern', (_name, change) => {
      expect(strictOf({ ...processAlert('C:\\t.exe'), ...change })).not.toBe(
        strictOf(processAlert('C:\\t.exe'))
      );
      expect(wideOf({ ...processAlert('C:\\t.exe'), ...change })).not.toBe(
        wideOf(processAlert('C:\\t.exe'))
      );
    });

    it('splits the detections of a rule that overrides the alert name', () => {
      const override = (detection: string) =>
        processAlert('C:\\t.exe', {
          'kibana.alert.rule.rule_name_override': 'message',
          rule: { id: detection },
        });
      expect(strictOf(override('d1'))).not.toBe(strictOf(override('d2')));
    });
  });

  describe('the wide key', () => {
    it('cuts the executable to its folder, so one folder is one pattern', () => {
      expect(wideOf(processAlert('C:\\Tools\\a.exe'))).toBe(
        wideOf(processAlert('C:\\Tools\\b.exe'))
      );
      expect(strictOf(processAlert('C:\\Tools\\a.exe'))).not.toBe(
        strictOf(processAlert('C:\\Tools\\b.exe'))
      );
    });

    it('keeps two folders apart', () => {
      expect(wideOf(processAlert('C:\\Tools\\a.exe'))).not.toBe(
        wideOf(processAlert('C:\\Other\\a.exe'))
      );
    });

    it('cuts the file path too', () => {
      const file = (path: string) => ({
        ...RULE,
        ...WINDOWS,
        event: { category: ['file'] },
        file: { path, hash: { sha256: 'aa' } },
        process: { executable: 'C:\\t.exe' },
      });
      expect(wideOf(file('C:\\d\\one.tmp'))).toBe(wideOf(file('C:\\d\\two.tmp')));
    });

    it('does not cut a DLL or registry path', () => {
      const dll = (path: string) => ({
        ...RULE,
        ...WINDOWS,
        event: { category: ['library'] },
        dll: { path, code_signature: { subject_name: 'Acme' } },
      });
      expect(wideOf(dll('C:\\l\\a.dll'))).not.toBe(wideOf(dll('C:\\l\\b.dll')));
    });
  });

  describe('an alert with no identifying field (cloud, identity, network)', () => {
    const cloud = (rule: string, user: string) => ({
      'kibana.alert.rule.uuid': rule,
      'kibana.alert.rule.revision': 1,
      user: { name: user },
    });

    // A Decision matches the strict key. If this alert had one, it would be "the whole rule", and
    // one approved decision would close every later alert of that rule.
    it('has no strict key', () => {
      expect(strictOf(cloud('r', 'a'))).toBeUndefined();
    });

    it('is grouped by rule and detection, whoever the user is', () => {
      expect(wideOf(cloud('r', 'a'))).toBe(wideOf(cloud('r', 'b')));
      expect(wideOf(cloud('r', 'a'))).not.toBe(wideOf(cloud('r2', 'a')));
    });
  });
});
