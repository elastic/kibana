/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveFpTpOutcome, FP_TP_RAW_EVENT_WINDOW_MS } from '../world';
import {
  buildFpTpExampleWorld,
  FP_TP_EXAMPLES,
  FP_TP_SCENARIOS,
  getFpTpScenario,
  type FpTpRegisteredExample,
  type FpTpVariant,
} from '.';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exampleIds = FP_TP_EXAMPLES.map(({ id }) => id);

describe('FP/TP scenario registry', () => {
  it('returns unique scenario keys', () => {
    const keys = FP_TP_SCENARIOS.map(({ key }) => key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('returns unique example ids', () => {
    expect(new Set(exampleIds).size).toBe(exampleIds.length);
  });

  it.each(FP_TP_EXAMPLES.map(({ id, scenarioKey }) => [id, scenarioKey]))(
    'returns %s prefixed with its scenario key',
    (id, scenarioKey) => {
      expect(id.startsWith(`${scenarioKey}.`)).toBe(true);
    }
  );

  it.each(FP_TP_EXAMPLES.filter(({ checks }) => checks).map((example) => [example.id, example]))(
    'returns a %s gold that follows from its checks',
    (_id, { checks, expectedOutcome }) => {
      expect(checks && deriveFpTpOutcome(checks)).toBe(expectedOutcome);
    }
  );

  const baseOf = ({ variant }: FpTpRegisteredExample): FpTpRegisteredExample | undefined =>
    FP_TP_EXAMPLES.find(({ id }) => id === variant?.of);

  const variantsOfKind = (
    kind: FpTpVariant['kind']
  ): ReadonlyArray<[string, FpTpRegisteredExample]> =>
    FP_TP_EXAMPLES.filter(({ variant }) => variant?.kind === kind).map((example) => [
      example.id,
      example,
    ]);

  it.each(FP_TP_EXAMPLES.filter(({ variant }) => variant).map((example) => [example.id, example]))(
    'returns a %s base from its own scenario',
    (id, example) => {
      const base = baseOf(example);
      expect(base !== undefined && base.id !== id && base.scenarioKey === example.scenarioKey).toBe(
        true
      );
    }
  );

  it('returns checks for every variant and its base', () => {
    expect(
      FP_TP_EXAMPLES.filter(
        (example) => example.variant && !(example.checks && baseOf(example)?.checks)
      ).map(({ id }) => id)
    ).toEqual([]);
  });

  it.each(variantsOfKind('mutation'))(
    'returns %s checks that differ from its base checks',
    (_id, example) => {
      expect(example.checks).not.toEqual(baseOf(example)?.checks);
    }
  );

  it.each(variantsOfKind('perturbation'))(
    'returns %s checks equal to its base checks',
    (_id, example) => {
      expect(example.checks).toEqual(baseOf(example)?.checks);
    }
  );

  it('throws for an unknown scenario key', () => {
    expect(() => getFpTpScenario('nope')).toThrow('Unknown FP/TP scenario "nope"');
  });

  it('throws for an unknown example id', () => {
    expect(() => buildFpTpExampleWorld('nope', 'run1')).toThrow('Unknown FP/TP example "nope"');
  });

  describe.each(FP_TP_EXAMPLES.map(({ id, scenarioKey }) => [id, scenarioKey]))(
    '%s',
    (id, scenarioKey) => {
      const { sharedNames } = getFpTpScenario(scenarioKey);
      const first = buildFpTpExampleWorld(id, 'run1');
      const second = buildFpTpExampleWorld(id, 'run2');

      it('returns at least one alert', () => {
        expect(first.alerts.length).toBeGreaterThan(0);
      });

      it('returns no unsuffixed shared name anywhere in the world', () => {
        const unsuffixed = new RegExp(`(${sharedNames.map(escapeRegExp).join('|')})(?!-run1)`);
        expect(JSON.stringify(first)).not.toMatch(unsuffixed);
      });

      it('returns disjoint alert ids for two suffixes', () => {
        const firstIds = new Set(first.alerts.map((alert) => alert.id));
        expect(second.alerts.some((alert) => firstIds.has(alert.id))).toBe(false);
      });

      it('returns disjoint event ids for two suffixes', () => {
        const firstIds = new Set(first.events.map((event) => event.id));
        expect(second.events.some((event) => firstIds.has(event.id))).toBe(false);
      });

      it('returns disjoint entity ids for two suffixes', () => {
        const firstIds = new Set(first.entities.map((entity) => entity.id));
        expect(second.entities.some((entity) => firstIds.has(entity.id))).toBe(false);
      });

      it('returns different attack ids for two suffixes', () => {
        expect(first.attackId).not.toBe(second.attackId);
      });

      it('returns raw events within the workflow window around the attack', () => {
        const attackTimestamp = Date.parse(String(first.attack?.['@timestamp']));
        const outside = !first.attack
          ? []
          : first.events.filter(
              (event) =>
                Math.abs(Date.parse(String(event.source['@timestamp'])) - attackTimestamp) >
                FP_TP_RAW_EVENT_WINDOW_MS
            );
        expect(outside).toEqual([]);
      });
    }
  );
});
