/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ACCEPT_BREAKING_CHANGE_COMMAND,
  ACCEPT_BREAKING_CHANGE_FLAG,
  GENERATE_SETTINGS_CONTRACT_SNAPSHOT,
  assertSchemaDefaultsDeclared,
  buildWorkerSettingsContracts,
  describeContractChanges,
  describeBaseBranchFailure,
  diffWorkerSettingsContracts,
  nextSettingsContractSnapshot,
  normalizeSettingsSchema,
  parseAcceptedIssue,
  parseSettingsContractSnapshot,
  toInputJsonSchema,
  type AcceptedBreakingChange,
  type SettingsContractSnapshot,
  type WorkerSettingsContracts,
} from './settings_contract';

const WORKER = 'rule-tuning';

/** A Worker shaped like the real ones: strict top level, closed `extras`, declaration defaults. */
const contractFor = (
  extras: z.ZodRawShape | undefined,
  extrasDefaults: Record<string, unknown>,
  {
    autonomy = ['manual', 'assisted'],
    scheduleInterval,
  }: { autonomy?: readonly [string, ...string[]]; scheduleInterval?: z.ZodType } = {}
): WorkerSettingsContracts => {
  const schema = normalizeSettingsSchema(
    z
      .object({
        workerId: z.literal(WORKER),
        autonomy: z.enum(autonomy),
        ...(scheduleInterval ? { scheduleInterval } : {}),
        ...(extras ? { extras: z.object(extras).strict() } : {}),
      })
      .strict(),
    WORKER
  );
  if (schema.kind !== 'object') {
    throw new Error('expected an object contract');
  }
  return {
    [WORKER]: {
      defaults: {
        workerId: WORKER,
        autonomy: 'manual',
        ...(scheduleInterval ? { scheduleInterval: '2h' } : {}),
        ...(extras ? { extras: extrasDefaults } : {}),
      },
      schema,
    },
  };
};

const windowDays = () => z.number().int().min(1).max(30);

const baseContract = (): WorkerSettingsContracts =>
  contractFor({ analysisWindowDays: windowDays() }, { analysisWindowDays: 7 });

/** A contract whose `extras.field` is `field`, beside the base window setting. */
const withField = (field: z.ZodType, defaultValue: unknown): WorkerSettingsContracts =>
  contractFor(
    { analysisWindowDays: windowDays(), field },
    { analysisWindowDays: 7, field: defaultValue }
  );

const contractChangeMessage = (
  next: WorkerSettingsContracts,
  previous = baseContract()
): string | undefined => {
  const changes = diffWorkerSettingsContracts(previous, next);
  return changes.length > 0 ? describeContractChanges(changes) : undefined;
};

describe('Worker settings contract', () => {
  it('builds the contract for every registered Worker from the input side of its schema', () => {
    const contracts = buildWorkerSettingsContracts();
    const ruleTuning = contracts['system-security-detection-rule-tuning'];
    expect(ruleTuning?.schema.fields.autonomy).toEqual({
      kind: 'leaf',
      type: 'string',
      enum: ['manual', 'assisted'],
    });
    expect(ruleTuning?.schema.additionalProperties).toBe(false);
  });

  it('accepts an unchanged contract', () => {
    expect(contractChangeMessage(baseContract())).toBeUndefined();
  });

  describe('safe changes, which only ask for a regenerated snapshot', () => {
    it.each([
      ['an integer', z.number().int().min(0).max(10), 3],
      ['a boolean', z.boolean(), false],
      ['a bounded array', z.array(z.string().max(64)).max(20), []],
      ['a nullable string', z.string().max(10).nullable(), null],
    ])('adding %s with a default', (_label, field, defaultValue) => {
      const message = contractChangeMessage(withField(field, defaultValue));
      expect(message).toContain('This change is safe for stored Worker settings.');
      expect(message).toContain('[safe] added rule-tuning.extras.field with a default');
      expect(message).toContain(GENERATE_SETTINGS_CONTRACT_SNAPSHOT);
      expect(message).not.toContain(ACCEPT_BREAKING_CHANGE_FLAG);
    });

    it.each([
      [
        'added Worker',
        baseContract(),
        {} as WorkerSettingsContracts,
        '[safe] added Worker rule-tuning',
      ],
      [
        'removed bound',
        withField(z.number().min(1), 1),
        withField(z.number().min(1).max(5), 1),
        '[safe] removed the maximum of 5 on rule-tuning.extras.field',
      ],
      [
        'removed pattern',
        withField(z.string(), 'a'),
        withField(z.string().regex(/^a/), 'a'),
        '[safe] removed the pattern of rule-tuning.extras.field',
      ],
      [
        'allowed null',
        withField(z.string().nullable(), 'a'),
        withField(z.string(), 'a'),
        '[safe] allowed null on rule-tuning.extras.field',
      ],
      [
        'allowed extra keys',
        withField(z.object({ a: z.number() }), { a: 1 }),
        withField(z.object({ a: z.number() }).strict(), { a: 1 }),
        '[safe] allowed extra keys on rule-tuning.extras.field',
      ],
      [
        'made optional',
        withField(z.number().optional(), 1),
        withField(z.number(), 1),
        '[safe] made rule-tuning.extras.field optional',
      ],
      [
        'made required with a filled default',
        withField(z.number(), 1),
        withField(z.number().optional(), 1),
        '[safe] made rule-tuning.extras.field required, filled from its default',
      ],
      [
        'removed extras entirely',
        contractFor(undefined, {}),
        baseContract(),
        '[safe] removed rule-tuning.extras. Stored extras are ignored on read and render.',
      ],
    ])('%s', (_label, next, previous, expected) => {
      const message = contractChangeMessage(next, previous);
      expect(message).toContain(expected);
      expect(message).not.toContain('[breaking]');
    });

    it('loosening a bound and widening an enum', () => {
      const message = contractChangeMessage(
        contractFor(
          { analysisWindowDays: z.number().int().min(1).max(60) },
          { analysisWindowDays: 7 },
          { autonomy: ['manual', 'assisted', 'supervised'] }
        )
      );
      expect(message).toContain('[safe] loosened rule-tuning.extras.analysisWindowDays maximum');
      expect(message).toContain('[safe] widened rule-tuning.autonomy, adding supervised');
      expect(message).not.toContain('[breaking]');
    });

    it('changing a default, which reaches every document that does not store the field', () => {
      const message = contractChangeMessage(
        contractFor({ analysisWindowDays: windowDays() }, { analysisWindowDays: 8 })
      );
      expect(message).toContain('[safe] default extras.analysisWindowDays changed from 7 to 8');
      expect(message).toContain(
        'fresh installs and to every stored document that does not hold the field; a stored value always wins'
      );
    });

    it('adding a schedule, which takes effect on the next save or enable', () => {
      const message = contractChangeMessage(
        contractFor(
          { analysisWindowDays: windowDays() },
          { analysisWindowDays: 7 },
          { scheduleInterval: z.string().max(6) }
        )
      );
      expect(message).toContain('[safe] added rule-tuning.scheduleInterval with a default');
      expect(message).toContain('next save or enable in each space');
    });

    it('removing an autonomy level that has a lower allowed level, which startup moves documents to', () => {
      const withLevels = (autonomy: readonly [string, ...string[]]) =>
        contractFor({ analysisWindowDays: windowDays() }, { analysisWindowDays: 7 }, { autonomy });
      const message = contractChangeMessage(
        withLevels(['manual', 'assisted']),
        withLevels(['manual', 'assisted', 'supervised'])
      );
      expect(message).toContain(
        '[safe] removed supervised from rule-tuning.autonomy. A stored supervised is read and rendered as assisted.'
      );
      expect(message).toContain('Scheduled runs pick this up on the next save or enable');
      expect(message).not.toContain('[breaking]');

      const replaced = contractChangeMessage(
        withLevels(['manual', 'assisted']),
        withLevels(['manual', 'supervised'])
      );
      expect(replaced).toContain('A stored supervised is read and rendered as assisted.');
      expect(replaced).toContain('[safe] widened rule-tuning.autonomy, adding assisted');
    });

    it('an unchanged array default is not reported', () => {
      const withList = () => withField(z.array(z.string()).max(5), ['a']);
      expect(contractChangeMessage(withList(), withList())).toBeUndefined();
    });
  });

  describe('breaking changes, which need to be accepted', () => {
    it.each([
      [
        'a tightened bound',
        contractFor(
          { analysisWindowDays: z.number().int().min(3).max(30) },
          { analysisWindowDays: 7 }
        ),
        '[breaking] tightened rule-tuning.extras.analysisWindowDays minimum from 1 to 3',
      ],
      [
        'removing the lowest autonomy level',
        contractFor(
          { analysisWindowDays: windowDays() },
          { analysisWindowDays: 7 },
          { autonomy: ['assisted'] }
        ),
        '[breaking] removed manual from rule-tuning.autonomy with no lower allowed level',
      ],
      [
        'a removed field',
        contractFor({}, {}),
        '[breaking] removed rule-tuning.extras.analysisWindowDays',
      ],
      [
        'a retyped field',
        contractFor({ analysisWindowDays: z.string() }, { analysisWindowDays: '7' }),
        '[breaking] retyped rule-tuning.extras.analysisWindowDays from integer to string',
      ],
      [
        'a required field with no default',
        contractFor(
          { analysisWindowDays: windowDays(), added: z.boolean() },
          { analysisWindowDays: 7 }
        ),
        '[breaking] added required rule-tuning.extras.added with no declaration default to fill stored documents from',
      ],
      ['a removed Worker', {} as WorkerSettingsContracts, '[breaking] removed Worker rule-tuning'],
    ])('%s', (_label, next, expected) => {
      const message = contractChangeMessage(next);
      expect(message).toContain('This change breaks stored Worker settings.');
      expect(message).toContain(expected);
      expect(message).toContain('https://github.com/elastic/security-team/issues/19312');
      expect(message).toContain(ACCEPT_BREAKING_CHANGE_COMMAND);
    });

    it.each([
      [
        'added bound',
        withField(z.number().max(5), 1),
        withField(z.number(), 1),
        '[breaking] added a maximum of 5 on rule-tuning.extras.field',
      ],
      [
        'raised minLength',
        withField(z.string().min(2), 'ab'),
        withField(z.string().min(1), 'ab'),
        '[breaking] tightened rule-tuning.extras.field minLength from 1 to 2',
      ],
      [
        'lowered maxLength',
        withField(z.string().max(5), 'a'),
        withField(z.string().max(10), 'a'),
        '[breaking] tightened rule-tuning.extras.field maxLength from 10 to 5',
      ],
      [
        'changed pattern',
        withField(z.string().regex(/^b/), 'b'),
        withField(z.string().regex(/^a/), 'b'),
        '[breaking] changed the pattern of rule-tuning.extras.field',
      ],
      [
        'changed const',
        withField(z.literal('b'), 'b'),
        withField(z.literal('a'), 'a'),
        '[breaking] changed rule-tuning.extras.field from "a" to "b"',
      ],
      [
        'rejected extra keys',
        withField(z.object({ a: z.number() }).strict(), { a: 1 }),
        withField(z.object({ a: z.number() }), { a: 1 }),
        '[breaking] rejected extra keys on rule-tuning.extras.field',
      ],
      [
        'made required where nothing fills it',
        withField(z.object({ a: z.number() }).strict(), { a: 1 }),
        withField(z.object({ a: z.number().optional() }).strict(), { a: 1 }),
        '[breaking] made rule-tuning.extras.field.a required with no default',
      ],
      [
        'changed node kind',
        withField(z.array(z.string()), []),
        withField(z.string(), 'a'),
        '[breaking] retyped rule-tuning.extras.field from leaf to array',
      ],
    ])('%s', (_label, next, previous, expected) => {
      expect(contractChangeMessage(next, previous)).toContain(expected);
    });

    it('turning a free string into an enum', () => {
      expect(
        contractChangeMessage(withField(z.enum(['a', 'b']), 'a'), withField(z.string(), 'a'))
      ).toContain('[breaking] restricted rule-tuning.extras.field to a, b');
      expect(
        contractChangeMessage(withField(z.string(), 'a'), withField(z.enum(['a', 'b']), 'a'))
      ).toContain('[safe] removed the allowed values of rule-tuning.extras.field');
    });

    it('tightening an array bound and dropping null', () => {
      expect(
        contractChangeMessage(
          withField(z.array(z.string()).max(5), []),
          withField(z.array(z.string()).max(20), [])
        )
      ).toContain('[breaking] tightened rule-tuning.extras.field maxItems from 20 to 5');
      expect(
        contractChangeMessage(
          withField(z.array(z.string()), []),
          withField(z.array(z.string()).nullable(), [])
        )
      ).toContain('[breaking] stopped allowing null on rule-tuning.extras.field');
    });

    it('a new required key inside a nested object, which the upgrade does not reach', () => {
      expect(
        contractChangeMessage(
          withField(z.object({ a: z.number(), b: z.number() }).strict(), { a: 1, b: 2 }),
          withField(z.object({ a: z.number() }).strict(), { a: 1 })
        )
      ).toContain('[breaking] added required rule-tuning.extras.field.b');
    });

    it('labels each line and offers the label-only exit only for removals and narrowings', () => {
      const message = contractChangeMessage(
        contractFor(
          { analysisWindowDays: z.number().int().min(3).max(30), added: z.boolean() },
          { analysisWindowDays: 7, added: true }
        )
      );
      expect(message).toContain('[safe] added rule-tuning.extras.added with a default');
      expect(message).toContain('[breaking] tightened rule-tuning.extras.analysisWindowDays');
      expect(message).toContain('keep the stored key and value');

      const retypeOnly = contractChangeMessage(
        contractFor({ analysisWindowDays: z.string() }, { analysisWindowDays: '7' })
      );
      expect(retypeOnly).not.toContain('keep the stored key and value');
    });
  });

  it('fails loudly on a JSON Schema construct it does not understand', () => {
    expect(() => normalizeSettingsSchema(z.object({ a: z.number().positive() }), 'x')).toThrow(
      /Unclassified JSON Schema keyword exclusiveMinimum at x\.a/
    );
    expect(() =>
      normalizeSettingsSchema(z.object({ a: z.record(z.string(), z.number()) }), 'x')
    ).toThrow(/Unclassified/);
    expect(() =>
      normalizeSettingsSchema(z.object({ a: z.union([z.string(), z.number()]) }), 'x')
    ).toThrow(/Unclassified anyOf at x\.a/);
  });

  it('rejects a schema default the declaration does not have', () => {
    const jsonSchema = toInputJsonSchema(
      z.object({ extras: z.object({ a: z.number().default(1) }) })
    );
    expect(() => assertSchemaDefaultsDeclared('x', jsonSchema, { extras: {} })).toThrow(
      /has a default for extras\.a that its declaration does not/
    );
    expect(() => assertSchemaDefaultsDeclared('x', jsonSchema, { extras: { a: 1 } })).not.toThrow();
  });

  it('rejects a file that is not a settings contract snapshot', () => {
    expect(() => parseSettingsContractSnapshot('{"workers":{}}')).toThrow(
      /is not a settings contract snapshot/
    );
  });

  const tightened = () =>
    contractFor({ analysisWindowDays: z.number().int().min(3).max(30) }, { analysisWindowDays: 7 });

  const TIGHTENED_TEXT = 'tightened rule-tuning.extras.analysisWindowDays minimum from 1 to 3';

  const accepted = (issue: number, changes = [TIGHTENED_TEXT]): AcceptedBreakingChange => ({
    issue: `https://github.com/elastic/security-team/issues/${issue}`,
    changes,
  });

  const snapshot = (
    workers: WorkerSettingsContracts,
    acceptedBreakingChanges: AcceptedBreakingChange[] = []
  ): SettingsContractSnapshot => ({ acceptedBreakingChanges, workers });

  describe('against the base branch', () => {
    it('stays red when the snapshot was regenerated without accepting the breaking change', () => {
      const message = describeBaseBranchFailure(
        snapshot(baseContract()),
        snapshot(tightened()),
        tightened()
      );
      expect(message).toContain('it was not accepted');
      expect(message).toContain(TIGHTENED_TEXT);
    });

    it('passes once the breaking change is accepted', () => {
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract()),
          snapshot(tightened(), [accepted(1)]),
          tightened()
        )
      ).toBeUndefined();
    });

    it('stays red when the only entry is one the base branch already has', () => {
      const earlier = accepted(1, ['removed rule-tuning.extras.old']);
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract(), [earlier]),
          snapshot(tightened(), [earlier]),
          tightened()
        )
      ).toContain('it was not accepted');
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract(), [earlier]),
          snapshot(tightened(), [earlier, accepted(2)]),
          tightened()
        )
      ).toBeUndefined();
    });

    it('fails when entries from the base branch were dropped or changed', () => {
      const earlier = accepted(1, ['removed rule-tuning.extras.old']);
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract(), [earlier]),
          snapshot(baseContract(), [accepted(2)]),
          baseContract()
        )
      ).toContain('must start with every entry the base branch has');
    });

    it('passes a safe change without accepting anything', () => {
      const added = withField(z.boolean(), false);
      expect(
        describeBaseBranchFailure(snapshot(baseContract()), snapshot(added), added)
      ).toBeUndefined();
    });
  });

  describe('the next snapshot the generator writes', () => {
    const ISSUE = 'https://github.com/elastic/security-team/issues/5';

    it('refuses a breaking change without an accepted issue', () => {
      expect(() =>
        nextSettingsContractSnapshot({ committed: snapshot(baseContract()), current: tightened() })
      ).toThrow(/Refusing to update the snapshot/);
    });

    it('records an accepted breaking change after the existing entries', () => {
      const earlier = accepted(1, ['removed rule-tuning.extras.old']);
      expect(
        nextSettingsContractSnapshot({
          committed: snapshot(baseContract(), [earlier]),
          current: tightened(),
          acceptedIssue: ISSUE,
        })
      ).toEqual(snapshot(tightened(), [earlier, { issue: ISSUE, changes: [TIGHTENED_TEXT] }]));
    });

    it('refuses the flag when nothing breaks', () => {
      expect(() =>
        nextSettingsContractSnapshot({
          committed: snapshot(baseContract()),
          current: baseContract(),
          acceptedIssue: ISSUE,
        })
      ).toThrow(/nothing in this change breaks/);
    });

    it('accepts a break of the base branch when the committed snapshot already matches the code', () => {
      expect(
        nextSettingsContractSnapshot({
          committed: snapshot(tightened()),
          current: tightened(),
          base: snapshot(baseContract()),
          acceptedIssue: ISSUE,
        })
      ).toEqual(snapshot(tightened(), [{ issue: ISSUE, changes: [TIGHTENED_TEXT] }]));
    });

    it('does not ask for the flag again once this branch accepted the break', () => {
      const done = snapshot(tightened(), [accepted(5)]);
      expect(
        nextSettingsContractSnapshot({
          committed: done,
          current: tightened(),
          base: snapshot(baseContract()),
        })
      ).toEqual(done);
    });
  });

  describe('parseAcceptedIssue', () => {
    it.each([
      'https://github.com/elastic/security-team/issues/123',
      'https://github.com/elastic/kibana/pull/456',
    ])('accepts %s', (url) => {
      expect(parseAcceptedIssue([ACCEPT_BREAKING_CHANGE_FLAG, url])).toBe(url);
    });

    it.each([
      [[ACCEPT_BREAKING_CHANGE_FLAG]],
      [[ACCEPT_BREAKING_CHANGE_FLAG, 'https://github.com/elastic/kibana/issues/1#issuecomment-2']],
      [[ACCEPT_BREAKING_CHANGE_FLAG, 'https://github.com/other/repo/issues/1']],
    ])('rejects %j', (argv) => {
      expect(() => parseAcceptedIssue(argv)).toThrow(/needs the GitHub issue/);
    });

    it('returns undefined without the flag', () => {
      expect(parseAcceptedIssue([])).toBeUndefined();
    });
  });
});
