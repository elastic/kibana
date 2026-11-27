/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { matchCardsToIntegrationsStats } from './integrations_card';

jest.mock('../../../../onboarding_context');

const card = (id: string, extra: Partial<IntegrationCardItem> = {}) =>
  ({ id, name: id, title: id, ...extra }) as IntegrationCardItem;

describe('matchCardsToIntegrationsStats', () => {
  it('keeps only cards with stats, ordered by total rules descending', () => {
    const result = matchCardsToIntegrationsStats(
      [card('epr:a'), card('epr:b'), card('epr:c')],
      [
        { id: 'epr:c', total_rules: 9 },
        { id: 'epr:a', total_rules: 4 },
      ]
    );

    expect(result.map(({ id }) => id)).toEqual(['epr:c', 'epr:a']);
    expect(result.every((c) => c.titleBadge)).toBe(true);
  });

  it('matches a collection card on the stats of its members', () => {
    const collection = card('collection:nginx', {
      isCollectionCard: true,
      groupMembers: [card('epr:nginx'), card('epr:nginx_otel')],
    });

    const result = matchCardsToIntegrationsStats(
      [card('epr:a'), collection],
      [
        { id: 'epr:a', total_rules: 2 },
        { id: 'epr:nginx_otel', total_rules: 7 },
      ]
    );

    // the collection is ranked by the total of its members (7), not by its best member's position
    expect(result.map(({ id }) => id)).toEqual(['collection:nginx', 'epr:a']);
  });

  it('shows the combined total of a collection in its badge and ranks it by that total', () => {
    const collection = card('collection:nginx', {
      isCollectionCard: true,
      groupMembers: [card('epr:nginx'), card('epr:nginx_otel')],
    });

    const result = matchCardsToIntegrationsStats(
      [card('epr:a'), collection],
      [
        { id: 'epr:a', total_rules: 5 },
        { id: 'epr:nginx', total_rules: 3 },
        { id: 'epr:nginx_otel', total_rules: 3 },
      ]
    );

    // 3 + 3 outranks the single package with 5, although neither member does on its own
    expect(result.map(({ id }) => id)).toEqual(['collection:nginx', 'epr:a']);
    expect(result[0].titleBadge).toEqual(
      expect.objectContaining({ props: expect.objectContaining({ children: '6 rules' }) })
    );
  });

  it('keeps the order of the cards that have the same total', () => {
    const result = matchCardsToIntegrationsStats(
      [card('epr:b'), card('epr:a'), card('epr:c')],
      [
        { id: 'epr:a', total_rules: 4 },
        { id: 'epr:b', total_rules: 4 },
        { id: 'epr:c', total_rules: 9 },
      ]
    );

    expect(result.map(({ id }) => id)).toEqual(['epr:c', 'epr:b', 'epr:a']);
  });

  it('drops a collection card when none of its members has stats', () => {
    const collection = card('collection:nginx', {
      isCollectionCard: true,
      groupMembers: [card('epr:nginx')],
    });

    expect(matchCardsToIntegrationsStats([collection], [{ id: 'epr:a', total_rules: 1 }])).toEqual(
      []
    );
  });
});
