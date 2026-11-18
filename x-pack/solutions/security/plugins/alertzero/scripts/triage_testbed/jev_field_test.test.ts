/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Decide, SampleAlert } from './jev_experiment';
import {
  CHANGES,
  buildFieldReport,
  changedCopies,
  scoreFieldChanges,
  selectBases,
  type BaseResult,
  type ChangeResult,
} from './jev_field_test';

type Doc = Record<string, unknown>;

const random = () => 0.5;

const processDoc: Doc = {
  'kibana.alert.rule.uuid': 'rule-1',
  'process.executable': 'C:\\Program Files\\Acme\\agent.exe',
  'process.command_line': 'agent.exe --run',
  'process.code_signature.subject_name': 'Acme Soft Inc.',
  'process.parent.executable': 'C:\\Windows\\explorer.exe',
  'process.hash.sha256': 'aa',
  'user.name': 'user001',
  'host.name': 'host-1',
};
const fileDoc: Doc = {
  'file.path': '/var/data/a.dat',
  'file.hash.sha256': 'ff',
  'process.executable': '/usr/bin/tool',
  'process.command_line': 'tool --x',
  'user.name': 'user002',
};
const registryDoc: Doc = {
  'registry.path': 'HKLM\\Software\\Acme',
  'process.executable': 'C:\\Tools\\reg.exe',
  'process.command_line': 'reg.exe --y',
  'user.name': 'user003',
};
const cloudDoc: Doc = {
  'event.action': 'ListBuckets',
  'cloud.account.id': '123456789012',
  'user.name': 'user004',
};

const changeOf = (name: string) => {
  const found = CHANGES.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`no change ${name}`);
  return found;
};

const changedFields = (before: Doc, after: Doc | undefined): string[] =>
  after === undefined
    ? []
    : [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
        (key) => before[key] !== after[key]
      );

describe('the changes', () => {
  it('change exactly one field and leave the alert that they were given untouched', () => {
    const snapshot = JSON.stringify(processDoc);

    for (const candidate of CHANGES) {
      const after = candidate.apply(processDoc, 'process', random);
      if (after === undefined) continue;
      expect(changedFields(processDoc, after)).toHaveLength(1);
    }
    expect(JSON.stringify(processDoc)).toBe(snapshot);
  });

  it('give every change a class, so that the report knows which are bad and which are harmless', () => {
    expect(new Set(CHANGES.map(({ class: changeClass }) => changeClass))).toEqual(
      new Set(['bad', 'harmless', 'ambiguous'])
    );
    expect(new Set(CHANGES.map(({ name }) => name)).size).toBe(CHANGES.length);
  });

  it('double one letter of the signer to make a look-alike, and only for a process alert that has a signer', () => {
    expect(changeOf('signer_lookalike').apply(processDoc, 'process', random)).toMatchObject({
      'process.code_signature.subject_name': 'Acmme Soft Inc.',
    });
    expect(changeOf('signer_lookalike').apply(fileDoc, 'file', random)).toBeUndefined();
    expect(changeOf('signer_case').apply(processDoc, 'process', random)).toMatchObject({
      'process.code_signature.subject_name': 'ACME SOFT INC.',
    });
  });

  it('add an argument to the command line of a process, file or registry alert, and not of a cloud alert', () => {
    expect(changeOf('argument_download').apply(processDoc, 'process', random)).toMatchObject({
      'process.command_line': 'agent.exe --run http://203.0.113.9/payload.exe',
    });
    expect(changeOf('argument_verbose').apply(registryDoc, 'registry', random)).toMatchObject({
      'process.command_line': 'reg.exe --y --verbose',
    });
    expect(changeOf('argument_verbose').apply(cloudDoc, 'cloud', random)).toBeUndefined();
  });

  it('move the program to a folder of public files or to a version folder, and the file of a file alert', () => {
    expect(changeOf('folder_public').apply(processDoc, 'process', random)).toMatchObject({
      'process.executable': 'C:\\Users\\Public\\agent.exe',
    });
    expect(changeOf('folder_public').apply(fileDoc, 'file', random)).toMatchObject({
      'file.path': 'C:/Users/Public/a.dat',
    });
    expect(changeOf('folder_version').apply(processDoc, 'process', random)).toMatchObject({
      'process.executable': 'C:\\Program Files\\Acme\\v2\\agent.exe',
    });
    expect(changeOf('folder_version').apply(cloudDoc, 'cloud', random)).toBeUndefined();
  });

  it('change the parent only of a process alert that has one', () => {
    expect(changeOf('parent_office').apply(processDoc, 'process', random)).toMatchObject({
      'process.parent.executable': expect.stringContaining('WINWORD.EXE'),
    });
    expect(changeOf('parent_service').apply(processDoc, 'process', random)).toMatchObject({
      'process.parent.executable': 'C:\\Windows\\System32\\services.exe',
    });
    expect(changeOf('parent_office').apply(registryDoc, 'registry', random)).toBeUndefined();
    expect(
      changeOf('parent_office').apply(
        { ...registryDoc, 'process.parent.executable': 'C:\\Windows\\explorer.exe' },
        'registry',
        random
      )
    ).toBeUndefined();
    expect(
      changeOf('parent_office').apply(
        { ...processDoc, 'process.parent.executable': undefined },
        'process',
        random
      )
    ).toBeUndefined();
  });

  it('give an alert an external or an internal destination, for every kind', () => {
    for (const [doc, kind] of [
      [processDoc, 'process'],
      [cloudDoc, 'cloud'],
    ] as const) {
      expect(
        String(changeOf('destination_external').apply(doc, kind, random)?.['destination.ip'])
      ).toMatch(/^203\.0\.113\.\d+$/);
      expect(
        String(changeOf('destination_internal').apply(doc, kind, random)?.['destination.ip'])
      ).toMatch(/^10\.0\.\d+\.\d+$/);
    }
  });

  it('change the account of a cloud alert only, and the user of any alert that has one', () => {
    expect(
      changeOf('account_other').apply(cloudDoc, 'cloud', random)?.['cloud.account.id']
    ).toMatch(/^\d{12}$/);
    expect(
      changeOf('account_other').apply(cloudDoc, 'cloud', random)?.['cloud.account.id']
    ).not.toBe('123456789012');
    expect(changeOf('account_other').apply(processDoc, 'process', random)).toBeUndefined();
    expect(
      changeOf('account_other').apply({ ...processDoc, 'cloud.account.id': '1' }, 'process', random)
    ).toBeUndefined();
    expect(changeOf('user_other').apply(fileDoc, 'file', random)?.['user.name']).not.toBe(
      'user002'
    );
    expect(changeOf('user_other').apply({ 'host.name': 'h' }, 'process', random)).toBeUndefined();
  });

  it('give a process or a file alert a new hash in the field of its kind, and nothing for a registry alert', () => {
    expect(changeOf('hash_new').apply(processDoc, 'process', random)).toHaveProperty([
      'process.hash.sha256',
    ]);
    expect(changeOf('hash_new').apply(fileDoc, 'file', random)?.['file.hash.sha256']).toMatch(
      /^[0-9a-f]{64}$/
    );
    expect(changeOf('hash_new').apply(registryDoc, 'registry', random)).toBeUndefined();
  });
});

describe('selectBases', () => {
  const alert = (
    id: string,
    kind: string,
    overrides: Partial<SampleAlert['truth']> = {}
  ): SampleAlert => ({
    id,
    doc: {},
    truth: { verdict: 'false_positive', variant: null, benign: null, kind, ...overrides },
  });
  const alerts = [
    ...Array.from({ length: 6 }, (_unused, i) => alert(`p${i}`, 'process')),
    ...Array.from({ length: 3 }, (_unused, i) => alert(`c${i}`, 'cloud')),
    alert('attack', 'process', { verdict: 'true_positive' }),
    alert('variant', 'process', { variant: 'new_hash' }),
    alert('update', 'process', { benign: 'hash_update' }),
    alert('agg', 'aggregate'),
  ];

  it('takes only benign alerts that are not variants or hash updates, and leaves out the alerts without a key', () => {
    const ids = selectBases(alerts, { seed: 1 }).map(({ id }) => id);

    expect(ids).toHaveLength(9);
    expect(ids).not.toEqual(expect.arrayContaining(['attack']));
    for (const excluded of ['attack', 'variant', 'update', 'agg'])
      expect(ids).not.toContain(excluded);
  });

  it('caps each kind on its own, in an order that the seed decides', () => {
    const first = selectBases(alerts, { seed: 1, perKind: 2 }).map(({ id }) => id);

    expect(first.filter((id) => id.startsWith('p'))).toHaveLength(2);
    expect(first.filter((id) => id.startsWith('c'))).toHaveLength(2);
    expect(selectBases(alerts, { seed: 1, perKind: 2 }).map(({ id }) => id)).toEqual(first);
    expect(selectBases(alerts, { seed: 2, perKind: 2 }).map(({ id }) => id)).not.toEqual(first);
  });
});

describe('changedCopies', () => {
  const alert: SampleAlert = {
    id: 'x',
    doc: processDoc,
    truth: { verdict: 'false_positive', variant: null, benign: null, kind: 'process' },
  };

  it('gives the changes that apply to the kind, the same ones every time for the same seed', () => {
    const first = changedCopies(alert, 7).map(({ change: { name }, doc }) => [name, doc]);

    expect(changedCopies(alert, 7).map(({ change: { name }, doc }) => [name, doc])).toEqual(first);
    expect(first.map(([name]) => name)).toContain('signer_lookalike');
    expect(first.map(([name]) => name)).not.toContain('account_other');
    expect(
      changedCopies({ ...alert, truth: { ...alert.truth, kind: 'cloud' }, doc: cloudDoc }, 7).map(
        ({ change: { name } }) => name
      )
    ).toEqual(['destination_external', 'destination_internal', 'account_other', 'user_other']);
  });
});

describe('buildFieldReport', () => {
  const bases: BaseResult[] = [
    {
      id: 'a',
      kind: 'process',
      scores: { choice: [0.01, 0.02], benign: [0.3, 0.3], indicator: [0.5, 0.5] },
    },
    {
      id: 'b',
      kind: 'process',
      scores: { choice: [0.01, 0.01], benign: [0.3, 0.3], indicator: [0.5, 0.5] },
    },
    {
      id: 'c',
      kind: 'process',
      scores: { choice: [0.5, 0.5], benign: [0.3, 0.3], indicator: [0.5, 0.5] },
    },
  ];
  const result = (
    baseId: string,
    changeName: string,
    choice: number | undefined
  ): ChangeResult => ({
    baseId,
    kind: 'process',
    change: changeName,
    scores: choice === undefined ? {} : { choice, benign: 0.3, indicator: 0.5 },
  });
  const report = buildFieldReport({
    bases,
    results: [
      result('a', 'argument_download', 0.9),
      result('b', 'argument_download', 0.1),
      result('c', 'argument_download', 0.99),
      result('a', 'argument_verbose', 0.2),
      result('b', 'argument_verbose', 0.02),
      result('c', 'argument_verbose', undefined),
    ],
    calls: 20,
    failedCalls: 1,
    failureReasons: { 'choice: the model answered 429': 1 },
  });
  const choice = report.perWording.choice;

  it('says how far the score of one change moved, from the mean score before to the mean score after', () => {
    expect(choice.changes.argument_download).toMatchObject({
      class: 'bad',
      n: 3,
      kinds: { process: 3 },
      meanBaseScore: 0.175,
      meanChangedScore: 0.6633,
      meanAbsoluteDifference: 0.4883,
    });
  });

  it('counts the share of alerts that moved by more than each threshold, and that left the benign lane or reached the attack lane', () => {
    // Differences 0.885, 0.09 and 0.49 against the base scores 0.015, 0.01 and 0.5.
    expect(choice.changes.argument_download.movedMoreThan).toEqual({ '0.05': 1, '0.15': 0.6667 });
    // Two alerts were in the benign lane (a and b). Both moved above 0.05.
    expect(choice.changes.argument_download.leftBenignLane).toBe(1);
    expect(choice.changes.argument_download.reachedAttackLane).toBe(0.3333);
  });

  it('does not count a move of exactly the threshold, and counts a drop of the score as a move', () => {
    const edge = buildFieldReport({
      bases: [
        { id: 'z', kind: 'process', scores: { choice: [0, 0], benign: [0, 0], indicator: [0, 0] } },
        {
          id: 'y',
          kind: 'process',
          scores: { choice: [0.9, 0.9], benign: [0, 0], indicator: [0, 0] },
        },
      ],
      results: [
        { baseId: 'z', kind: 'process', change: 'user_other', scores: { choice: 0.15 } },
        { baseId: 'y', kind: 'process', change: 'user_other', scores: { choice: 0.1 } },
      ],
    });

    // 0.15 is not more than 0.15, and a fall from 0.9 to 0.1 moves by 0.8.
    expect(edge.perWording.choice.changes.user_other.movedMoreThan).toEqual({
      '0.05': 1,
      '0.15': 0.5,
    });
    expect(edge.perWording.choice.changes.user_other.meanAbsoluteDifference).toBe(0.475);
  });

  it('leaves out an alert that has no answer for a change, and counts the others', () => {
    expect(choice.changes.argument_verbose.n).toBe(2);
  });

  it('gives, per threshold, the share of bad changes that the guard catches and the share of harmless changes that it flags', () => {
    const [strict, guard] = choice.thresholds;

    expect(strict).toMatchObject({
      threshold: 0.05,
      bad: { n: 3, caught: 3, caughtShare: 1 },
      harmless: { n: 2, flagged: 1, flaggedShare: 0.5 },
    });
    expect(guard).toMatchObject({
      threshold: 0.15,
      bad: { n: 3, caught: 2, caughtShare: 0.6667 },
      harmless: { n: 2, flagged: 1, flaggedShare: 0.5 },
    });
  });

  it('reports the noise: the difference between two scores of the same unchanged alert', () => {
    expect(report.repeatSpread.choice.p95).toBe(0.01);
    expect(report.repeatSpread.benign).toEqual({ p50: 0, p95: 0 });
  });

  it('carries the counts of the calls and the kinds of the alerts', () => {
    expect(report).toMatchObject({
      baseAlerts: 3,
      baseKinds: { process: 3 },
      calls: 20,
      failedCalls: 1,
      failureReasons: { 'choice: the model answered 429': 1 },
    });
  });

  it('has no shares for a class with no change', () => {
    const empty = buildFieldReport({ bases, results: [] });

    expect(empty.perWording.choice.thresholds[0]).toMatchObject({
      bad: { n: 0, caughtShare: null },
      harmless: { n: 0, flaggedShare: null },
    });
  });
});

describe('scoreFieldChanges', () => {
  const alerts: SampleAlert[] = [
    {
      id: 'p-1',
      doc: processDoc,
      truth: { verdict: 'false_positive', variant: null, benign: null, kind: 'process' },
    },
    {
      id: 'c-1',
      doc: cloudDoc,
      truth: { verdict: 'false_positive', variant: null, benign: null, kind: 'cloud' },
    },
  ];
  const noPause = async (_ms: number) => undefined;

  it('scores each alert twice and each changed copy once, in every wording', async () => {
    const decide = jest.fn<ReturnType<Decide>, Parameters<Decide>>(async () => ({
      score: 0.1,
      ms: 5,
    }));

    const result = await scoreFieldChanges({
      bases: alerts,
      decide,
      seed: 1,
      concurrency: 2,
      pause: noPause,
    });

    const changes = alerts.reduce((sum, alert) => sum + changedCopies(alert, 1).length, 0);
    expect(decide).toHaveBeenCalledTimes((alerts.length * 2 + changes) * 3);
    expect(result.results).toHaveLength(changes);
    expect(result.bases.map(({ scores }) => scores.choice)).toEqual([
      [0.1, 0.1],
      [0.1, 0.1],
    ]);
  });

  it('sends the changed text, so that the score can depend on the change', async () => {
    const decide: Decide = async (input) => ({
      score: input.includes('payload.exe') ? 0.95 : 0.01,
      ms: 1,
    });

    const result = await scoreFieldChanges({
      bases: [alerts[0]],
      decide,
      seed: 1,
      concurrency: 1,
      pause: noPause,
    });

    const scoreOf = (name: string) =>
      result.results.find(({ change }) => change === name)?.scores.choice;
    expect(scoreOf('argument_download')).toBe(0.95);
    expect(scoreOf('argument_verbose')).toBe(0.01);
  });

  it('counts a call that fails three times by wording and reason, and leaves that score out', async () => {
    const decide: Decide = async (input, wording) => {
      if (wording === 'indicator') throw new Error('the model answered 429');
      return { score: input.length > 0 ? 0.2 : 0, ms: 1 };
    };

    const result = await scoreFieldChanges({
      bases: [alerts[1]],
      decide,
      seed: 1,
      concurrency: 1,
      pause: noPause,
    });

    expect(result.failedCalls).toBeGreaterThan(0);
    expect(Object.keys(result.failureReasons)).toEqual(['indicator: the model answered 429']);
    expect(result.results.every(({ scores }) => scores.indicator === undefined)).toBe(true);
    expect(result.results.every(({ scores }) => scores.choice === 0.2)).toBe(true);
  });
});
