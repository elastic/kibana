/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  GENERATE_SETTINGS_CONTRACT_SNAPSHOT,
  PRE_CUSTOMER_RESET_FLAG,
  buildWorkerSettingsContracts,
  describeContractChanges,
  diffWorkerSettingsContracts,
  normalizeSettingsSchema,
  unrecordedBreakingChange,
  type SettingsContractSnapshot,
  type WorkerSettingsContracts,
} from './settings_contract';

const WORKER = 'rule-tuning';

/** A Worker shaped like the real ones: strict top level, closed `extras`, declaration defaults. */
const contractFor = (
  extras: z.ZodRawShape,
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
        extras: z.object(extras).strict(),
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
        extras: extrasDefaults,
      },
      schema,
    },
  };
};

const windowDays = () => z.number().int().min(1).max(30);

const base = (): WorkerSettingsContracts =>
  contractFor({ analysisWindowDays: windowDays() }, { analysisWindowDays: 7 });

const describe_ = (next: WorkerSettingsContracts, previous = base()): string | undefined => {
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
    expect(describe_(base())).toBeUndefined();
  });

  describe('safe changes, which only ask for a regenerated snapshot', () => {
    it.each([
      ['an integer', z.number().int().min(0).max(10), 3],
      ['a boolean', z.boolean(), false],
      ['a bounded array', z.array(z.string().max(64)).max(20), []],
      ['a nullable string', z.string().max(10).nullable(), null],
    ])('adding %s with a default', (_label, field, defaultValue) => {
      const message = describe_(
        contractFor(
          { analysisWindowDays: windowDays(), added: field },
          { analysisWindowDays: 7, added: defaultValue }
        )
      );
      expect(message).toContain('This change is safe for stored Worker settings.');
      expect(message).toContain('[safe] added rule-tuning.extras.added with a default');
      expect(message).toContain(GENERATE_SETTINGS_CONTRACT_SNAPSHOT);
      expect(message).not.toContain(PRE_CUSTOMER_RESET_FLAG);
    });

    it('loosening a bound and widening an enum', () => {
      const message = describe_(
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

    it('changing a default, which reaches fresh installs only', () => {
      const message = describe_(
        contractFor({ analysisWindowDays: windowDays() }, { analysisWindowDays: 8 })
      );
      expect(message).toContain('[safe] default extras.analysisWindowDays changed from 7 to 8');
      expect(message).toContain('fresh installs only and never rewrites stored values');
    });

    it('adding a schedule, which takes effect on the next save or enable', () => {
      const message = describe_(
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
      const message = describe_(
        withLevels(['manual', 'assisted']),
        withLevels(['manual', 'assisted', 'supervised'])
      );
      expect(message).toContain(
        '[safe] removed supervised from rule-tuning.autonomy. A stored supervised is lowered to assisted at startup.'
      );
      expect(message).not.toContain('[breaking]');

      const replaced = describe_(
        withLevels(['manual', 'assisted']),
        withLevels(['manual', 'supervised'])
      );
      expect(replaced).toContain('A stored supervised is lowered to assisted at startup.');
      expect(replaced).toContain('[safe] widened rule-tuning.autonomy, adding assisted');
    });

    it('an unchanged array default is not reported', () => {
      const withList = () =>
        contractFor(
          { analysisWindowDays: windowDays(), excluded: z.array(z.string()).max(5) },
          { analysisWindowDays: 7, excluded: ['a'] }
        );
      expect(describe_(withList(), withList())).toBeUndefined();
    });
  });

  describe('breaking changes, which need a recorded reset', () => {
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
        '[breaking] added required rule-tuning.extras.added that the startup fill has no default for',
      ],
    ])('%s', (_label, next, expected) => {
      const message = describe_(next);
      expect(message).toContain('This change breaks stored Worker settings.');
      expect(message).toContain(expected);
      expect(message).toContain('https://github.com/elastic/security-team/issues/19312');
      expect(message).toContain(
        `${GENERATE_SETTINGS_CONTRACT_SNAPSHOT} ${PRE_CUSTOMER_RESET_FLAG} <issue-url>`
      );
    });

    it('turning a free string into an enum', () => {
      const withLabel = (field: z.ZodType) =>
        contractFor(
          { analysisWindowDays: windowDays(), label: field },
          {
            analysisWindowDays: 7,
            label: 'a',
          }
        );
      expect(describe_(withLabel(z.enum(['a', 'b'])), withLabel(z.string()))).toContain(
        '[breaking] restricted rule-tuning.extras.label to a, b'
      );
      expect(describe_(withLabel(z.string()), withLabel(z.enum(['a', 'b'])))).toContain(
        '[safe] removed the allowed values of rule-tuning.extras.label'
      );
    });

    it('tightening an array bound and dropping null', () => {
      const withList = (field: z.ZodType) =>
        contractFor(
          { analysisWindowDays: windowDays(), excluded: field },
          {
            analysisWindowDays: 7,
            excluded: [],
          }
        );
      expect(
        describe_(withList(z.array(z.string()).max(5)), withList(z.array(z.string()).max(20)))
      ).toContain('[breaking] tightened rule-tuning.extras.excluded maxItems from 20 to 5');
      expect(
        describe_(withList(z.array(z.string())), withList(z.array(z.string()).nullable()))
      ).toContain('[breaking] stopped allowing null on rule-tuning.extras.excluded');
    });

    it('a new required key inside a nested object, which the startup fill does not reach', () => {
      const withNested = (shape: z.ZodRawShape, nested: Record<string, unknown>) =>
        contractFor(
          { analysisWindowDays: windowDays(), nested: z.object(shape).strict() },
          {
            analysisWindowDays: 7,
            nested,
          }
        );
      expect(
        describe_(
          withNested({ a: z.number(), b: z.number() }, { a: 1, b: 2 }),
          withNested({ a: z.number() }, { a: 1 })
        )
      ).toContain('[breaking] added required rule-tuning.extras.nested.b');
    });

    it('labels each line and offers the label-only exit only for removals and narrowings', () => {
      const message = describe_(
        contractFor(
          { analysisWindowDays: z.number().int().min(3).max(30), added: z.boolean() },
          { analysisWindowDays: 7, added: true }
        )
      );
      expect(message).toContain('[safe] added rule-tuning.extras.added with a default');
      expect(message).toContain('[breaking] tightened rule-tuning.extras.analysisWindowDays');
      expect(message).toContain('keep the stored key and value');

      const retypeOnly = describe_(
        contractFor({ analysisWindowDays: z.string() }, { analysisWindowDays: '7' })
      );
      expect(retypeOnly).not.toContain('keep the stored key and value');
    });
  });

  it('fails loudly on a JSON Schema keyword it does not understand', () => {
    expect(() => normalizeSettingsSchema(z.object({ a: z.number().positive() }), 'x')).toThrow(
      /Unclassified JSON Schema keyword exclusiveMinimum at x\.a/
    );
    expect(() =>
      normalizeSettingsSchema(z.object({ a: z.record(z.string(), z.number()) }), 'x')
    ).toThrow(/Unclassified/);
  });

  describe('against the base branch', () => {
    const snapshot = (
      workers: WorkerSettingsContracts,
      resetIssues: string[] = []
    ): SettingsContractSnapshot => ({
      preCustomerResets: resetIssues.map((issue) => ({ issue, changes: [] })),
      workers,
    });
    const tightened = () =>
      contractFor(
        { analysisWindowDays: z.number().int().min(3).max(30) },
        { analysisWindowDays: 7 }
      );

    it('stays red when the snapshot was regenerated without recording a reset', () => {
      const message = unrecordedBreakingChange(
        snapshot(base()),
        snapshot(tightened()),
        tightened()
      );
      expect(message).toContain('no reset was recorded');
      expect(message).toContain('tightened rule-tuning.extras.analysisWindowDays minimum');
    });

    it('passes once the reset is recorded', () => {
      expect(
        unrecordedBreakingChange(
          snapshot(base()),
          snapshot(tightened(), ['https://github.com/elastic/security-team/issues/1']),
          tightened()
        )
      ).toBeUndefined();
    });

    it('passes a safe change without a reset', () => {
      const added = contractFor(
        { analysisWindowDays: windowDays(), added: z.boolean() },
        { analysisWindowDays: 7, added: false }
      );
      expect(unrecordedBreakingChange(snapshot(base()), snapshot(added), added)).toBeUndefined();
    });
  });
});
