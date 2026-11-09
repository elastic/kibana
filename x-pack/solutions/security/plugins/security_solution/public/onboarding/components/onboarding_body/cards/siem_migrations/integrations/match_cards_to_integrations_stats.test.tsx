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
  ({ id, name: id, title: id, ...extra } as IntegrationCardItem);

describe('matchCardsToIntegrationsStats', () => {
  it('keeps only cards with stats, in the order of the stats', () => {
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

    // the collection's best-ranked member comes first in the stats, so it keeps that position
    expect(result.map(({ id }) => id)).toEqual(['epr:a', 'collection:nginx']);
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
