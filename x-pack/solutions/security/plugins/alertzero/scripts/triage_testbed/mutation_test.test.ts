/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildPatternKeys } from '../../server/alert_triage/pattern_key';
import {
  MUTATIONS,
  buildMutationReport,
  readDay,
  readDump,
  simulateKey,
  type SimAlert,
} from './mutation_test';

type Doc = Record<string, unknown>;

const random = () => 0.5;

const processDoc = (extra: Doc = {}): Doc => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.revision': 1,
  'host.os.type': 'windows',
  'event.category': ['process'],
  'process.executable': 'C:\\Tools\\agent.exe',
  'process.code_signature.subject_name': 'Acme',
  'process.code_signature.trusted': true,
  'process.hash.sha256': 'aa',
  'process.command_line': 'agent.exe --run',
  ...extra,
});

const fileDoc = (extra: Doc = {}): Doc => ({
  'kibana.alert.rule.uuid': 'rule-2',
  'kibana.alert.rule.revision': 1,
  'host.os.type': 'windows',
  'event.category': ['file'],
  'file.path': 'C:\\Data\\a.dat',
  'file.hash.sha256': 'ff',
  'process.executable': 'C:\\Tools\\agent.exe',
  'process.code_signature.trusted': true,
  'process.command_line': 'agent.exe --run',
  ...extra,
});

const registryDoc = (extra: Doc = {}): Doc => ({
  'kibana.alert.rule.uuid': 'rule-3',
  'kibana.alert.rule.revision': 1,
  'host.os.type': 'windows',
  'event.category': ['registry'],
  'registry.path': 'HKLM\\Software\\Acme',
  'process.executable': 'C:\\Tools\\agent.exe',
  'process.code_signature.trusted': true,
  'process.hash.sha256': 'aa',
  'process.command_line': 'agent.exe --run',
  ...extra,
});

const cloudDoc: Doc = {
  'kibana.alert.rule.uuid': 'rule-4',
  'kibana.alert.rule.revision': 1,
  'event.action': 'ListBuckets',
  'cloud.account.id': '1234',
};

let counter = 0;
const benign = (doc: Doc, minute: number, truth: Partial<SimAlert['truth']> = {}): SimAlert => ({
  id: `alert-${counter++}`,
  timestamp: Date.parse('2026-11-15T10:00:00Z') + minute * 60_000,
  doc,
  truth: { verdict: 'false_positive', variant: null, benign: null, ...truth },
});

const variant = (doc: Doc, minute: number, name: string): SimAlert =>
  benign(doc, minute, { verdict: 'true_positive', variant: name });

const strictOf = (doc: Doc): string => {
  const { strict } = buildPatternKeys(doc);
  if (strict === undefined) throw new Error('the test document has no strict key');
  return strict;
};

describe('simulateKey', () => {
  const key = strictOf(processDoc());
  const run = (alerts: SimAlert[], mode: 'on' | 'shadow' = 'on') =>
    simulateKey({ alerts, strictKey: key, mode });

  it('needs two agreeing runs before a record is active, and checks the alerts after that', () => {
    expect(run([benign(processDoc(), 1)])).toMatchObject({ activated: false, later: 0 });

    const outcome = run([
      benign(processDoc(), 1),
      benign(processDoc(), 2),
      benign(processDoc(), 3),
    ]);

    expect(outcome).toMatchObject({ kind: 'process', activated: true, later: 1, falseAlarms: 0 });
    expect(outcome.early?.lists.hash).toEqual(['aa']);
  });

  it('orders the alerts by time, whatever order they come in', () => {
    const outcome = run([
      benign(processDoc({ 'process.hash.sha256': 'new' }), 9),
      benign(processDoc(), 1),
      benign(processDoc(), 2),
    ]);

    expect(outcome).toMatchObject({ later: 1, falseAlarms: 1, falseAlarmFields: { hash: 1 } });
  });

  it('counts a benign alert with a new value as a false alarm, and a harmless hash update on its own', () => {
    const update = (minute: number) =>
      benign(processDoc({ 'process.hash.sha256': 'new' }), minute, { benign: 'hash_update' });

    const outcome = run([
      benign(processDoc(), 1),
      benign(processDoc(), 2),
      update(3),
      update(4),
      benign(processDoc({ 'host.name': 'other', 'user.name': 'bob' }), 5),
    ]);

    // The first update fires and is analyzed, so the hash joins the list. The second one is a known value.
    expect(outcome).toMatchObject({
      later: 3,
      falseAlarms: 1,
      hashUpdates: { later: 2, fired: 1 },
    });
  });

  it('checks a planted variant only when the record is active, and does not let it widen the lists', () => {
    const bad = (minute: number) =>
      variant(processDoc({ 'process.hash.sha256': 'evil' }), minute, 'new_hash');

    const outcome = run([
      bad(0),
      benign(processDoc(), 1),
      benign(processDoc(), 2),
      bad(3),
      bad(4),
      variant(processDoc(), 5, 'different_script_same_shape'),
    ]);

    expect(outcome.planted.map(({ state }) => state)).toEqual([
      'no_active_record',
      'caught',
      'caught',
      'missed',
    ]);
    expect(outcome.planted[1].fired).toEqual(['hash']);
  });

  it('catches a planted variant of a library key whose process is not trusted, with the field of the process trust', () => {
    const libraryDoc = (trusted: boolean): Doc => ({
      'kibana.alert.rule.uuid': 'rule-5',
      'kibana.alert.rule.revision': 1,
      'host.os.type': 'windows',
      'event.category': ['library'],
      'dll.path': 'C:\\Lib\\a.dll',
      'dll.code_signature.subject_name': 'Acme',
      'dll.code_signature.trusted': true,
      'process.code_signature.trusted': trusted,
    });

    const outcome = simulateKey({
      alerts: [
        benign(libraryDoc(true), 1),
        benign(libraryDoc(true), 2),
        variant(libraryDoc(false), 3, 'untrusted_signer'),
      ],
      strictKey: strictOf(libraryDoc(true)),
      mode: 'on',
    });

    expect(outcome.planted).toEqual([
      { variant: 'untrusted_signer', state: 'caught', fired: ['process_trusted'] },
    ]);
  });

  it('ignores a true positive that is not a planted variant', () => {
    const outcome = run([
      benign(processDoc(), 1),
      benign(processDoc(), 2),
      benign(processDoc({ 'process.hash.sha256': 'x' }), 3, { verdict: 'true_positive' }),
    ]);

    expect(outcome).toMatchObject({ later: 0, falseAlarms: 0 });
  });

  it('gives the lists at the end of the key, with the last benign alert as the base of a late mutation', () => {
    const last = benign(processDoc({ 'process.hash.sha256': 'later' }), 9);

    const outcome = run([benign(processDoc(), 1), benign(processDoc(), 2), last]);

    expect(outcome.late?.base.id).toBe(last.id);
    expect(outcome.late?.lists.hash).toEqual(['aa', 'later']);
  });
});

describe('MUTATIONS', () => {
  it('puts a new hash in the hash field of the kind of the key, and does not apply to a cloud key', () => {
    expect(MUTATIONS.new_hash.apply(processDoc(), 'process', random)).toMatchObject({
      'process.hash.sha256': expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(MUTATIONS.new_hash.apply(fileDoc(), 'file', random)).toHaveProperty([
      'file.hash.sha256',
    ]);
    expect(MUTATIONS.new_hash.apply(cloudDoc, 'cloud', random)).toBeUndefined();
  });

  it('turns the signature invalid in the field of the kind of the key', () => {
    expect(MUTATIONS.untrusted_signer.apply(processDoc(), 'process', random)).toMatchObject({
      'process.code_signature.trusted': false,
    });
    expect(MUTATIONS.untrusted_signer.apply({}, 'library', random)).toMatchObject({
      'dll.code_signature.trusted': false,
    });
  });

  it('makes an encoded PowerShell command line', () => {
    const mutated = MUTATIONS.encoded_command_line.apply(processDoc(), 'process', random);

    expect(mutated?.['process.command_line']).toMatch(/^powershell\.exe -enc [A-Za-z0-9+/=]{20,}$/);
  });

  it('runs another script with the same switches: it needs a quoted script, which the benign base supplies', () => {
    expect(
      MUTATIONS.different_script_same_shape.apply(processDoc(), 'process', random)
    ).toBeUndefined();

    const base = MUTATIONS.different_script_same_shape.benignBase?.(processDoc(), random);
    const mutated = MUTATIONS.different_script_same_shape.apply(base ?? {}, 'process', random);

    expect(base?.['process.command_line']).toMatch(/^agent\.exe -file "C:\\Tools\\.+\.ps1"$/);
    expect(mutated?.['process.command_line']).toMatch(
      /^agent\.exe -file "C:\\Users\\Public\\.+\.ps1"$/
    );
  });

  it('changes the parent only for a kind whose key does not hold it', () => {
    expect(MUTATIONS.new_parent.apply(processDoc(), 'process', random)).toBeUndefined();
    expect(MUTATIONS.new_parent.apply(fileDoc(), 'file', random)).toHaveProperty([
      'process.parent.executable',
    ]);
  });

  it('marks the change of user and host as the control', () => {
    expect(MUTATIONS.new_user_and_host.control).toBe(true);
    expect(MUTATIONS.new_hash.control).toBeUndefined();
  });
});

describe('buildMutationReport', () => {
  const keyed = (make: (extra: Doc) => Doc, count = 4): SimAlert[] =>
    Array.from({ length: count }, (_unused, i) => benign(make({}), i + 1));

  const report = buildMutationReport([
    ...keyed(processDoc),
    ...keyed(fileDoc),
    ...keyed(registryDoc),
    ...keyed(() => cloudDoc),
  ]);
  const tally = (name: keyof typeof MUTATIONS, kind: string, phase: 'early' | 'late' = 'early') =>
    report.mutations[name][phase][kind];

  it('counts the keys and the ones with an active record', () => {
    expect(report.keys).toEqual({ withBenignAlerts: 4, activated: 4 });
    expect(report.falseAlarms.on).toMatchObject({ laterBenignAlerts: 8, falseAlarms: 0 });
  });

  it('catches a new hash with the guard where the key holds none, and splits it off by the key where the key holds it', () => {
    expect(tally('new_hash', 'process')).toMatchObject({ tested: 1, caught: 1, splitByKey: 0 });
    expect(tally('new_hash', 'registry')).toMatchObject({ caught: 1 });
    expect(tally('new_hash', 'file')).toMatchObject({ splitByKey: 1, caught: 0 });
  });

  it('splits an invalid signature off by the key for a process, and catches it with the guard for a file or a registry key', () => {
    expect(tally('untrusted_signer', 'process')).toMatchObject({ splitByKey: 1, caught: 0 });
    expect(tally('untrusted_signer', 'file')).toMatchObject({ caught: 1, byField: { trusted: 1 } });
    expect(tally('untrusted_signer', 'registry')).toMatchObject({ caught: 1 });
  });

  it('catches an encoded command line, a new destination and another script with the same switches', () => {
    expect(tally('encoded_command_line', 'all')).toMatchObject({ tested: 3, caught: 3 });
    expect(tally('new_destination', 'all')).toMatchObject({ tested: 4, caught: 4 });
    expect(tally('different_script_same_shape', 'all')).toMatchObject({
      tested: 3,
      caught: 3,
      missed: 0,
      byField: { command_line_quoted: 3 },
    });
  });

  it('fires on nothing for the control, and counts a mutation that does not apply', () => {
    expect(tally('new_user_and_host', 'all')).toMatchObject({ tested: 4, caught: 0, missed: 4 });
    expect(report.mutations.new_hash.notApplicable).toBe(1);
    expect(report.mutations.new_parent.notApplicable).toBe(2);
  });

  it('tests a late mutation against the lists at the end of the key: a full list is not checked, so the late mutation is missed', () => {
    const noisy = Array.from({ length: 52 }, (_unused, i) =>
      benign(processDoc({ 'destination.ip': `10.0.0.${i}` }), i + 3)
    );

    const fullReport = buildMutationReport([
      benign(processDoc(), 1),
      benign(processDoc(), 2),
      ...noisy,
    ]);

    expect(fullReport.mutations.new_destination.early.process).toMatchObject({
      tested: 1,
      caught: 1,
    });
    expect(fullReport.mutations.new_destination.late.process).toMatchObject({
      tested: 1,
      missed: 1,
    });
  });

  it('reports a planted variant by type, and one that has a key of its own as such', () => {
    const planted = buildMutationReport([
      ...keyed(processDoc),
      variant(processDoc({ 'process.hash.sha256': 'evil' }), 9, 'new_hash'),
      variant(processDoc({ 'process.code_signature.trusted': false }), 9, 'untrusted_signer'),
    ]);

    expect(planted.plantedVariants.new_hash).toMatchObject({ alerts: 1, caught: 1, ownKey: 0 });
    expect(planted.plantedVariants.untrusted_signer).toMatchObject({ alerts: 1, ownKey: 1 });
  });

  it('measures the false alarms of both ways of filling the lists, by field and by kind', () => {
    const noisy = buildMutationReport([
      benign(processDoc(), 1),
      benign(processDoc(), 2),
      benign(processDoc({ 'destination.ip': '10.0.0.9' }), 3),
    ]);

    expect(noisy.falseAlarms.on).toMatchObject({
      laterBenignAlerts: 1,
      falseAlarms: 1,
      falseAlarmShare: 1,
      byField: { 'destination.ip': 1 },
      byKind: { process: { later: 1, falseAlarms: 1 } },
    });
    expect(noisy.falseAlarms.shadow.falseAlarms).toBe(1);
  });

  it('has no share when no benign alert came after a record was active', () => {
    expect(
      buildMutationReport([benign(processDoc(), 1)]).falseAlarms.on.falseAlarmShare
    ).toBeNull();
  });
});

describe('reading the files', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-'));
  afterAll(() => fs.rmSync(folder, { recursive: true, force: true }));

  const alertLine = (id: string, tags: string[]) =>
    JSON.stringify({
      _id: id,
      _source: {
        '@timestamp': '2026-11-15T10:00:00.000Z',
        'kibana.alert.workflow_tags': tags,
        'process.executable': 'C:\\a.exe',
        'unlisted.field': 'secret',
      },
    });

  it('reads a day with its truth, keeps only the fields that the key and the guard read, and refuses an alert without truth', async () => {
    fs.writeFileSync(path.join(folder, 'alerts.ndjson'), `${alertLine('a', [])}\n`);
    fs.writeFileSync(
      path.join(folder, 'truth.ndjson'),
      `${JSON.stringify({
        id: 'a',
        verdict: 'true_positive',
        variant: 'new_hash',
        benign: null,
      })}\n`
    );

    const [alert] = await readDay(folder);

    expect(alert.truth).toEqual({ verdict: 'true_positive', variant: 'new_hash', benign: null });
    expect(alert.doc['process.executable']).toBe('C:\\a.exe');
    expect(alert.doc['unlisted.field']).toBeUndefined();

    fs.writeFileSync(path.join(folder, 'truth.ndjson'), '');
    await expect(readDay(folder)).rejects.toThrow('has no truth record');
  });

  it('reads a dump with the verdict of the model as the truth, and leaves out an alert without a verdict', async () => {
    const file = path.join(folder, 'dump.ndjson');
    fs.writeFileSync(
      file,
      [
        alertLine('fp', ['az:false_positive']),
        alertLine('tp', ['az:true_positive']),
        alertLine('none', ['az:inconclusive']),
        alertLine('plain', []),
      ].join('\n')
    );

    const alerts = await readDump(file);

    expect(alerts.map(({ id, truth }) => [id, truth.verdict])).toEqual([
      ['fp', 'false_positive'],
      ['tp', 'true_positive'],
    ]);
    expect(alerts[0].truth).toMatchObject({ variant: null, benign: null });
  });
});
