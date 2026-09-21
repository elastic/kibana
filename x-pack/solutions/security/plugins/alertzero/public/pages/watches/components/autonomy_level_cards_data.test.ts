/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '@kbn/alertzero-common';
import {
  factValueParts,
  factValueToText,
  getAutonomyLevelCards,
  type AutonomyLevelCardsCopy,
} from './autonomy_level_cards_data';

const TRIAGE_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const AD_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

/**
 * The card copy is resolved from messages when the module is first imported, so a catalog has to be
 * in place before that import — hence the isolated require rather than a top-level one.
 *
 * `jest.isolateModules` sandboxes every module required *inside* its callback into a fresh
 * registry, so `./autonomy_level_cards_data` and the `@kbn/i18n` it imports are both distinct
 * instances from the ones already loaded at the top of this file. Initialising the outer `i18n`
 * import has no effect on that sandboxed instance — the override has to be set on the `i18n`
 * required from inside the same callback.
 */
const loadCardsWithCatalog = (messages: Record<string, string>): AutonomyLevelCardsCopy | null => {
  let cards: AutonomyLevelCardsCopy | null = null;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { i18n: isolatedI18n } = require('@kbn/i18n');
    isolatedI18n.init({ locale: 'xx', messages });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cards = require('./autonomy_level_cards_data').getAutonomyLevelCards(AD_WORKER_ID);
  });
  return cards;
};

const factValueOf = (workerId: string, level: string, label: string): string | undefined =>
  getAutonomyLevelCards(workerId)
    ?.levels.find((card) => card.level === level)
    ?.facts.find((fact) => fact.label === label)?.value;

describe('autonomy level card copy', () => {
  it('reads every fact value from the message catalog, so the copy is localizable', () => {
    const id =
      'xpack.alertzero.watches.settings.autonomyCards.attackDiscovery.manual.incidentsValue';
    const cards = loadCardsWithCatalog({ [id]: '<worker> escalate themselves' });
    const value = cards?.levels.find((card) => card.level === 'manual')?.facts[0].value;

    expect(value).toBe('<worker> escalate themselves');
    expect(factValueToText(value!)).toBe('Worker escalate themselves');
  });

  it('resolves actor tokens into pills wherever a translation places them', () => {
    expect(factValueParts('<worker> acts on its own — <you> review')).toEqual([
      { kind: 'pill', actor: 'worker' },
      { kind: 'text', text: ' acts on its own — ' },
      { kind: 'pill', actor: 'you' },
      { kind: 'text', text: ' review' },
    ]);
    // A translation that reorders or drops the pills still renders as plain text.
    expect(factValueParts('Nothing to review here')).toEqual([
      { kind: 'text', text: 'Nothing to review here' },
    ]);
  });

  it('promises no confidence threshold, because no Worker settings own one', () => {
    // Alert Triage's cards used to close false positives "at or above the confidence score": a
    // mechanism with no settings field behind it and no consumer reading one. A card may describe
    // what a level means, not a setting the Worker does not have.
    const offenders = SYSTEM_SECURITY_WORKER_IDS.flatMap((workerId) => {
      const cards = getAutonomyLevelCards(workerId);
      if (!cards) return [];
      return cards.levels.flatMap((level) =>
        [level.who, ...level.facts.map(({ value }) => value)]
          .filter((line) => /confidence/i.test(line))
          .map((line) => `${workerId} ${level.level}: ${line}`)
      );
    });

    expect(offenders).toEqual([]);
  });

  it('describes Alert Triage closures by who decides them', () => {
    expect(factValueToText(factValueOf(TRIAGE_WORKER_ID, 'manual', 'Closures')!)).toBe(
      'You answer each Proposal — accept to close, or reject and re-tag'
    );
    expect(factValueToText(factValueOf(TRIAGE_WORKER_ID, 'assisted', 'Closures')!)).toBe(
      'Worker closes false positives on its own — You reopen any you disagree with'
    );
    expect(factValueToText(factValueOf(TRIAGE_WORKER_ID, 'supervised', 'Closures')!)).toBe(
      'Worker closes false positives on its own — You reopen any you disagree with'
    );
  });
});
