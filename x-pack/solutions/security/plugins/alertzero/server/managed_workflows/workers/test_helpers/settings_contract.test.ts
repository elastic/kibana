/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { WorkerSettings } from '@kbn/alertzero-common';
import {
  ACCEPT_BREAKING_CHANGE_COMMAND,
  ACCEPT_BREAKING_CHANGE_ENV,
  UPDATE_SETTINGS_CONTRACT_COMMAND,
  assertComparableValidation,
  assertSchemaDefaultsDeclared,
  buildSharedSettingsContract,
  buildWorkerSettingsContracts,
  describeContractChanges,
  describeBaseBranchFailure,
  diffSettingsContracts,
  diffWorkerSettingsContracts,
  nextSettingsContractSnapshot,
  normalizeSettingsSchema,
  parseAcceptedIssue,
  parseSettingsContractSnapshot,
  toInputJsonSchema,
  workerStageOf,
  type AcceptedBreakingChange,
  type SettingsContract,
  type SettingsContractSnapshot,
  type SettingsObjectContract,
  type SharedSettingsContract,
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
      expect(message).toContain(UPDATE_SETTINGS_CONTRACT_COMMAND);
      expect(message).not.toContain(ACCEPT_BREAKING_CHANGE_ENV);
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
      expect(message).toContain(
        'This change breaks stored Worker settings or the saves that change them.'
      );
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
    ).toThrow(/Unclassified JSON Schema type at x\.a/);
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

  describe('the shared schemas every stored document and save goes through', () => {
    const SHARED_NOW = buildSharedSettingsContract();

    const objectNode = (schema: z.ZodType, label: string): SettingsObjectContract => {
      const node = normalizeSettingsSchema(schema, label);
      if (node.kind !== 'object') {
        throw new Error('expected an object contract');
      }
      return node;
    };

    const accountField = (field: z.ZodType, label: string) =>
      objectNode(z.object({ serviceAccountId: field }).strict(), label);

    const sharedChangeMessage = (
      previous: Partial<SharedSettingsContract>,
      next: Partial<SharedSettingsContract>
    ): string =>
      describeContractChanges(
        diffSettingsContracts(
          { shared: { ...SHARED_NOW, ...previous }, workers: {} },
          { shared: { ...SHARED_NOW, ...next }, workers: {} }
        )
      );

    it('records WorkerSettings and WorkerSettingsWrite, including the null a save sends to clear the account', () => {
      expect(SHARED_NOW.settingsWrite.fields.serviceAccountId).toMatchObject({
        nullable: true,
        maxLength: 1024,
      });
      expect(SHARED_NOW.storedSettings.fields.serviceAccountId).toMatchObject({ maxLength: 1024 });
    });

    it('reports a save body that stops accepting null for serviceAccountId as breaking', () => {
      const write = (field: z.ZodType) => accountField(field, 'WorkerSettingsWrite');
      expect(
        sharedChangeMessage(
          { settingsWrite: write(z.string().min(1).max(1024).nullable().optional()) },
          { settingsWrite: write(z.string().min(1).max(1024).optional()) }
        )
      ).toContain('[breaking] stopped allowing null on WorkerSettingsWrite.serviceAccountId');
    });

    it('reports a lower maximum on the save body alone as breaking', () => {
      const write = (max: number) =>
        accountField(z.string().min(1).max(max).nullable().optional(), 'WorkerSettingsWrite');
      expect(
        sharedChangeMessage({ settingsWrite: write(1024) }, { settingsWrite: write(512) })
      ).toContain(
        '[breaking] tightened WorkerSettingsWrite.serviceAccountId maxLength from 1024 to 512'
      );
    });

    it('reports a tighter second stage as breaking, which the first-stage JSON Schema cannot show', () => {
      const firstStage = z.object({ serviceAccountId: z.string().optional() }).strict();
      const secondStage = z.object({ serviceAccountId: z.string().max(512).optional() }).strict();
      expect(normalizeSettingsSchema(firstStage.pipe(secondStage), 'x')).toEqual(
        normalizeSettingsSchema(firstStage, 'x')
      );

      const stored = (max: number) =>
        accountField(z.string().min(1).max(max).optional(), 'WorkerSettings');
      expect(
        sharedChangeMessage({ storedSettings: stored(1024) }, { storedSettings: stored(512) })
      ).toContain(
        '[breaking] tightened WorkerSettings.serviceAccountId maxLength from 1024 to 512'
      );
    });

    it('reports a typed key added to an open object as breaking, since any value used to pass', () => {
      const stored = (extras: z.ZodType) =>
        objectNode(z.object({ extras: extras.optional() }).strict(), 'WorkerSettings');
      expect(
        sharedChangeMessage(
          { storedSettings: stored(z.object({}).catchall(z.unknown())) },
          {
            storedSettings: stored(z.object({ foo: z.number().optional() }).catchall(z.unknown())),
          }
        )
      ).toContain(
        '[breaking] constrained WorkerSettings.extras.foo, a key WorkerSettings.extras used to accept with any value'
      );
    });

    it('records the shared schemas once when a snapshot predates them', () => {
      expect(
        describeContractChanges(
          diffSettingsContracts({ workers: {} }, { shared: SHARED_NOW, workers: {} })
        )
      ).toContain('[safe] recorded the shared WorkerSettings and WorkerSettingsWrite schemas');
    });
  });

  describe('validation JSON Schema cannot express', () => {
    it('drops a refinement from the JSON Schema form, which is why it is checked separately', () => {
      expect(toInputJsonSchema(z.number().refine((value) => value !== 13))).toEqual(
        toInputJsonSchema(z.number())
      );
    });

    it.each([
      ['a refinement', z.number().refine((value) => value !== 13), /a refinement/],
      ['a superRefine', z.number().superRefine(() => undefined), /a refinement/],
      [
        'a transform',
        z.string().transform((value) => value.length),
        /a transform, preprocess or pipe/,
      ],
      [
        'a preprocess',
        z.preprocess((value) => value, z.number()),
        /a transform, preprocess or pipe/,
      ],
      ['an overwrite', z.string().overwrite((value) => value.trim()), /overwrite check/],
      ['a catch', z.number().catch(1), /a catch schema/],
      ['a regex with flags', z.string().regex(/^abc$/i), /a regex with flags \(\/\^abc\$\/i\)/],
    ])('fails explicitly on %s instead of comparing without it', (_label, field, reason) => {
      const check = () => assertComparableValidation(z.object({ field }).strict(), 'x');
      expect(check).toThrow(/Cannot establish settings compatibility at x\.field/);
      expect(check).toThrow(reason);
      expect(check).toThrow(/This is not a breaking change and cannot be accepted/);
    });

    it('fails explicitly on a refinement attached to the complete piped schema', () => {
      // Typed like the production builder in `contract.ts`, so the pipe into WorkerSettings compiles.
      const shape: Record<string, z.ZodType> = { workerId: z.literal('x') };
      const workerStage = z.object(shape).strict();
      expect(workerStageOf('x', workerStage.pipe(WorkerSettings))).toBe(workerStage);
      expect(() =>
        workerStageOf(
          'x',
          workerStage.pipe(WorkerSettings).refine((value) => value.workerId !== 'y')
        )
      ).toThrow(
        /Cannot establish settings compatibility at x: it uses a refinement \(\.refine, \.superRefine or \.check\) on the complete schema/
      );
    });

    it('accepts the constraints the classifier compares', () => {
      expect(() =>
        assertComparableValidation(
          z
            .object({
              bounded: z.number().int().min(1).max(30),
              patterned: z
                .string()
                .max(6)
                .regex(/^[1-9][0-9]*[mhd]$/),
              list: z
                .array(z.enum(['a', 'b']))
                .max(3)
                .nullable()
                .optional(),
              open: z.object({}).catchall(z.unknown()),
            })
            .strict(),
          'x'
        )
      ).not.toThrow();
    });

    it('finds nothing it cannot compare in the real schemas', () => {
      expect(() => buildWorkerSettingsContracts()).not.toThrow();
      expect(() => buildSharedSettingsContract()).not.toThrow();
    });
  });

  it('rejects a schema default deeper than the stored-settings upgrade fills', () => {
    const jsonSchema = toInputJsonSchema(
      z.object({ extras: z.object({ nested: z.object({ a: z.number().default(1) }) }) })
    );
    expect(() =>
      assertSchemaDefaultsDeclared('x', jsonSchema, { extras: { nested: { a: 1 } } })
    ).toThrow(/has a default for extras\.nested\.a, where stored settings are not filled/);
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

  const SHARED = buildSharedSettingsContract();

  const contractOf = (workers: WorkerSettingsContracts): SettingsContract => ({
    shared: SHARED,
    workers,
  });

  const snapshot = (
    workers: WorkerSettingsContracts,
    acceptedBreakingChanges: AcceptedBreakingChange[] = []
  ): SettingsContractSnapshot => ({ acceptedBreakingChanges, shared: SHARED, workers });

  describe('against the base branch', () => {
    it('stays red when the snapshot was regenerated without accepting the breaking change', () => {
      const message = describeBaseBranchFailure(
        snapshot(baseContract()),
        snapshot(tightened()),
        contractOf(tightened())
      );
      expect(message).toContain('no entry this branch added to acceptedBreakingChanges lists it');
      expect(message).toContain(TIGHTENED_TEXT);
    });

    it('passes once the breaking change is accepted', () => {
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract()),
          snapshot(tightened(), [accepted(1)]),
          contractOf(tightened())
        )
      ).toBeUndefined();
    });

    it('stays red when the only entry is one the base branch already has', () => {
      const earlier = accepted(1, ['removed rule-tuning.extras.old']);
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract(), [earlier]),
          snapshot(tightened(), [earlier]),
          contractOf(tightened())
        )
      ).toContain('no entry this branch added to acceptedBreakingChanges lists it');
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract(), [earlier]),
          snapshot(tightened(), [earlier, accepted(2)]),
          contractOf(tightened())
        )
      ).toBeUndefined();
    });

    it('stays red when a new entry does not list the breaking change', () => {
      const unlisted = { issue: 'https://github.com/elastic/security-team/issues/9', changes: [] };
      const message = describeBaseBranchFailure(
        snapshot(baseContract()),
        snapshot(tightened(), [unlisted]),
        contractOf(tightened())
      );
      expect(message).toContain('no entry this branch added to acceptedBreakingChanges lists it');
      expect(message).toContain(TIGHTENED_TEXT);
    });

    it('stays red for the breaking lines a new entry leaves out', () => {
      const both = contractFor(
        { analysisWindowDays: z.number().int().min(3).max(20) },
        { analysisWindowDays: 7 }
      );
      const message = describeBaseBranchFailure(
        snapshot(baseContract()),
        snapshot(both, [accepted(1)]),
        contractOf(both)
      );
      expect(message).toContain(
        'tightened rule-tuning.extras.analysisWindowDays maximum from 30 to 20'
      );
      expect(message).not.toContain(TIGHTENED_TEXT);
    });

    it('fails when entries from the base branch were dropped or changed', () => {
      const earlier = accepted(1, ['removed rule-tuning.extras.old']);
      expect(
        describeBaseBranchFailure(
          snapshot(baseContract(), [earlier]),
          snapshot(baseContract(), [accepted(2)]),
          contractOf(baseContract())
        )
      ).toContain('must start with every entry the base branch has');
    });

    it('passes a safe change without accepting anything', () => {
      const added = withField(z.boolean(), false);
      expect(
        describeBaseBranchFailure(snapshot(baseContract()), snapshot(added), contractOf(added))
      ).toBeUndefined();
    });
  });

  describe('the next snapshot update mode writes', () => {
    const ISSUE = 'https://github.com/elastic/security-team/issues/5';

    it('refuses a breaking change without an accepted issue', () => {
      expect(() =>
        nextSettingsContractSnapshot({
          committed: snapshot(baseContract()),
          current: contractOf(tightened()),
        })
      ).toThrow(/Refusing to update the snapshot/);
    });

    it('records an accepted breaking change after the existing entries', () => {
      const earlier = accepted(1, ['removed rule-tuning.extras.old']);
      expect(
        nextSettingsContractSnapshot({
          committed: snapshot(baseContract(), [earlier]),
          current: contractOf(tightened()),
          acceptedIssue: ISSUE,
        })
      ).toEqual(snapshot(tightened(), [earlier, { issue: ISSUE, changes: [TIGHTENED_TEXT] }]));
    });

    it('refuses an accepted issue when nothing breaks', () => {
      expect(() =>
        nextSettingsContractSnapshot({
          committed: snapshot(baseContract()),
          current: contractOf(baseContract()),
          acceptedIssue: ISSUE,
        })
      ).toThrow(/nothing in this change breaks/);
    });

    it('accepts a break of the base branch when the committed snapshot already matches the code', () => {
      expect(
        nextSettingsContractSnapshot({
          committed: snapshot(tightened()),
          current: contractOf(tightened()),
          base: snapshot(baseContract()),
          acceptedIssue: ISSUE,
        })
      ).toEqual(snapshot(tightened(), [{ issue: ISSUE, changes: [TIGHTENED_TEXT] }]));
    });

    it('records lines against the base branch, so a second tightening is listed as one change from it', () => {
      const tightenedTo = (minimum: number) =>
        contractFor(
          { analysisWindowDays: z.number().int().min(minimum).max(30) },
          { analysisWindowDays: 7 }
        );
      const base = snapshot(baseContract());
      const first = nextSettingsContractSnapshot({
        committed: base,
        current: contractOf(tightenedTo(3)),
        base,
        acceptedIssue: ISSUE,
      });
      expect(() =>
        nextSettingsContractSnapshot({
          committed: first,
          current: contractOf(tightenedTo(5)),
          base,
        })
      ).toThrow(/Refusing to update the snapshot/);
      const second = nextSettingsContractSnapshot({
        committed: first,
        current: contractOf(tightenedTo(5)),
        base,
        acceptedIssue: 'https://github.com/elastic/security-team/issues/6',
      });
      expect(second.acceptedBreakingChanges.map(({ changes }) => changes)).toEqual([
        [TIGHTENED_TEXT],
        ['tightened rule-tuning.extras.analysisWindowDays minimum from 1 to 5'],
      ]);
      expect(describeBaseBranchFailure(base, second, contractOf(tightenedTo(5)))).toBeUndefined();
    });

    it('writes without acceptance when a change on this branch is undone back to the base', () => {
      const loosened = contractFor(
        { analysisWindowDays: z.number().int().min(0).max(30) },
        { analysisWindowDays: 7 }
      );
      expect(
        nextSettingsContractSnapshot({
          committed: snapshot(loosened),
          current: contractOf(baseContract()),
          base: snapshot(baseContract()),
        })
      ).toEqual(snapshot(baseContract()));
    });

    it('does not ask for acceptance again once this branch accepted the break', () => {
      const done = snapshot(tightened(), [accepted(5)]);
      expect(
        nextSettingsContractSnapshot({
          committed: done,
          current: contractOf(tightened()),
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
      expect(parseAcceptedIssue(url)).toBe(url);
    });

    it.each([
      'https://github.com/elastic/kibana/issues/1#issuecomment-2',
      'https://github.com/other/repo/issues/1',
      'yes',
    ])('rejects %s', (value) => {
      expect(() => parseAcceptedIssue(value)).toThrow(/must be the GitHub issue/);
    });

    it('returns undefined when the variable is not set', () => {
      expect(parseAcceptedIssue(undefined)).toBeUndefined();
      expect(parseAcceptedIssue('')).toBeUndefined();
    });
  });
});
