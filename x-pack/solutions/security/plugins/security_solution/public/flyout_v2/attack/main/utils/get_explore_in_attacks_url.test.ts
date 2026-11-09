/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import { buildExploreInAttacksUrl } from './get_explore_in_attacks_url';
import { ATTACK_FLYOUT_V2_URL_PARAM } from './attack_flyout_v2_url_param';

const ATTACKS_BASE_URL = '/app/securitySolutionUI/attacks';

const parseUrlParams = (url: string) => {
  const params = new URLSearchParams(url.split('?')[1]);
  return {
    query: decode(params.get('query')!) as { language: string; query: string },
    timerange: decode(params.get('timerange')!) as {
      global: { timerange: { kind: string; from: string; to: string }; linkTo: unknown[] };
      timeline: { timerange: unknown; linkTo: unknown[] };
    },
    rawFlyout: params.get('flyout'),
    attackFlyoutV2:
      params.get(ATTACK_FLYOUT_V2_URL_PARAM) != null
        ? (decode(params.get(ATTACK_FLYOUT_V2_URL_PARAM)!) as {
            attackId: string;
            indexName: string;
          })
        : null,
  };
};

describe('buildExploreInAttacksUrl', () => {
  const TIMESTAMP = '2024-03-15T10:00:00.000Z';
  const EXPECTED_TO = '2024-03-15T10:05:00.000Z';

  const buildUrl = (attackId = 'attack-123', indexName = 'my-index') =>
    buildExploreInAttacksUrl({
      attackId,
      indexName,
      timestamp: TIMESTAMP,
      attacksBaseURL: ATTACKS_BASE_URL,
    });

  it('returns a URL prefixed with the provided base URL', () => {
    expect(buildUrl()).toMatch(new RegExp(`^${ATTACKS_BASE_URL}\\?`));
  });

  it('includes the correct KQL filter for the attackId', () => {
    const { query } = parseUrlParams(buildUrl('my-attack-id'));
    expect(query.language).toBe('kuery');
    expect(query.query).toBe('_id: my-attack-id');
  });

  it('sets timerange from to @timestamp and to to @timestamp + 5 minutes', () => {
    const { timerange } = parseUrlParams(buildUrl());
    expect(timerange.global.timerange.kind).toBe('absolute');
    expect(timerange.global.timerange.from).toBe(TIMESTAMP);
    expect(timerange.global.timerange.to).toBe(EXPECTED_TO);
  });

  it('encodes the attack id and index name under the v2 URL param', () => {
    const { attackFlyoutV2 } = parseUrlParams(buildUrl('attack-v2', 'my-v2-index'));
    expect(attackFlyoutV2).toEqual({ attackId: 'attack-v2', indexName: 'my-v2-index' });
  });

  it('does not include the legacy flyout URL param', () => {
    const { rawFlyout } = parseUrlParams(buildUrl());
    expect(rawFlyout).toBeNull();
  });
});
