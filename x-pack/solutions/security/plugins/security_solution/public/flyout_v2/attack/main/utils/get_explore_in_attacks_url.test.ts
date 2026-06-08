/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { decode } from '@kbn/rison';
import { getExploreInAttacksUrl, buildExploreInAttacksUrl } from './get_explore_in_attacks_url';
import { ATTACK_FLYOUT_V2_URL_PARAM } from './attack_flyout_v2_url_param';

const ATTACKS_BASE_URL = '/app/securitySolutionUI/attacks';

const createHit = (
  flattened: Record<string, unknown> = {},
  id: string = 'test-attack-id',
  index: string = '.internal.alerts-security.alerts-default'
): DataTableRecord =>
  ({
    id,
    raw: { _id: id, _index: index },
    flattened: { _id: id, _index: index, ...flattened },
    isAnchor: false,
  } as DataTableRecord);

const parseUrlParams = (url: string) => {
  const params = new URLSearchParams(url.split('?')[1]);
  return {
    query: decode(params.get('query')!) as { language: string; query: string },
    timerange: decode(params.get('timerange')!) as {
      global: { timerange: { kind: string; from: string; to: string }; linkTo: unknown[] };
      timeline: { timerange: unknown; linkTo: unknown[] };
    },
    rawFlyout: params.get('flyout'),
    flyout:
      params.get('flyout') != null
        ? (decode(params.get('flyout')!) as {
            right: { id: string; params: { attackId: string; indexName: string } };
          })
        : null,
    attackFlyoutV2Raw: params.get(ATTACK_FLYOUT_V2_URL_PARAM),
    attackFlyoutV2:
      params.get(ATTACK_FLYOUT_V2_URL_PARAM) != null
        ? (decode(params.get(ATTACK_FLYOUT_V2_URL_PARAM)!) as {
            attackId: string;
            indexName: string;
          })
        : null,
  };
};

describe('getExploreInAttacksUrl', () => {
  const TIMESTAMP = '2024-03-15T10:00:00.000Z';
  const EXPECTED_TO = '2024-03-15T10:05:00.000Z';

  it('returns a URL prefixed with the provided base URL', () => {
    const url = getExploreInAttacksUrl(createHit({ '@timestamp': TIMESTAMP }), ATTACKS_BASE_URL);
    expect(url).toMatch(new RegExp(`^${ATTACKS_BASE_URL}\\?`));
  });

  it('includes the correct KQL filter for the attackId', () => {
    const url = getExploreInAttacksUrl(
      createHit({ '@timestamp': TIMESTAMP }, 'my-attack-id'),
      ATTACKS_BASE_URL
    );
    const { query } = parseUrlParams(url);
    expect(query.language).toBe('kuery');
    expect(query.query).toBe('_id: my-attack-id');
  });

  it('sets timerange from to @timestamp and to to @timestamp + 5 minutes', () => {
    const url = getExploreInAttacksUrl(createHit({ '@timestamp': TIMESTAMP }), ATTACKS_BASE_URL);
    const { timerange } = parseUrlParams(url);
    expect(timerange.global.timerange.kind).toBe('absolute');
    expect(timerange.global.timerange.from).toBe(TIMESTAMP);
    expect(timerange.global.timerange.to).toBe(EXPECTED_TO);
  });

  it('encodes flyout params to auto-open the attack flyout for the given attackId and indexName', () => {
    const url = getExploreInAttacksUrl(
      createHit({ '@timestamp': TIMESTAMP }, 'attack-123', 'my-index'),
      ATTACKS_BASE_URL
    );
    const { flyout } = parseUrlParams(url);
    expect(flyout?.right.params.attackId).toBe('attack-123');
    expect(flyout?.right.params.indexName).toBe('my-index');
  });

  it('flyout right panel id is the AttackDetailsRightPanelKey by default (legacy flyout)', () => {
    const url = getExploreInAttacksUrl(createHit({ '@timestamp': TIMESTAMP }), ATTACKS_BASE_URL);
    const { flyout } = parseUrlParams(url);
    expect(flyout?.right.id).toBe('attack-details-right');
  });

  describe('when useFlyoutV2 is true', () => {
    it('encodes the attack id and index name under the v2 URL param', () => {
      const url = buildExploreInAttacksUrl({
        attackId: 'attack-v2',
        indexName: 'my-v2-index',
        timestamp: TIMESTAMP,
        attacksBaseURL: ATTACKS_BASE_URL,
        useFlyoutV2: true,
      });
      const { attackFlyoutV2 } = parseUrlParams(url);
      expect(attackFlyoutV2).toEqual({ attackId: 'attack-v2', indexName: 'my-v2-index' });
    });

    it('does not include the legacy flyout URL param', () => {
      const url = buildExploreInAttacksUrl({
        attackId: 'attack-v2',
        indexName: 'my-v2-index',
        timestamp: TIMESTAMP,
        attacksBaseURL: ATTACKS_BASE_URL,
        useFlyoutV2: true,
      });
      const { rawFlyout } = parseUrlParams(url);
      expect(rawFlyout).toBeNull();
    });

    it('still encodes the time range and query parameters', () => {
      const url = buildExploreInAttacksUrl({
        attackId: 'attack-v2',
        indexName: 'my-v2-index',
        timestamp: TIMESTAMP,
        attacksBaseURL: ATTACKS_BASE_URL,
        useFlyoutV2: true,
      });
      const { query, timerange } = parseUrlParams(url);
      expect(query.query).toBe('_id: attack-v2');
      expect(timerange.global.timerange.from).toBe(TIMESTAMP);
      expect(timerange.global.timerange.to).toBe(EXPECTED_TO);
    });

    it('getExploreInAttacksUrl forwards the useFlyoutV2 option', () => {
      const url = getExploreInAttacksUrl(
        createHit({ '@timestamp': TIMESTAMP }, 'hit-id', 'hit-index'),
        ATTACKS_BASE_URL,
        { useFlyoutV2: true }
      );
      const { attackFlyoutV2, rawFlyout } = parseUrlParams(url);
      expect(rawFlyout).toBeNull();
      expect(attackFlyoutV2).toEqual({ attackId: 'hit-id', indexName: 'hit-index' });
    });
  });
});
