/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normaliseEntityAttachment } from './payload';
import type { EntityAttachment, EntityAttachmentRiskStats } from './types';

const buildAttachment = (data: unknown): EntityAttachment =>
  ({
    id: 'a',
    type: 'security.entity',
    data: data as EntityAttachment['data'],
  } as EntityAttachment);

const riskStatsFixture = (
  override: Partial<EntityAttachmentRiskStats> = {}
): EntityAttachmentRiskStats => ({
  '@timestamp': '2024-01-01T00:00:00Z',
  id_field: 'host.name',
  id_value: 'alpha',
  calculated_level: 'High',
  calculated_score: 50,
  calculated_score_norm: 75,
  category_1_score: 40,
  category_1_count: 3,
  category_2_score: 10,
  notes: [],
  ...override,
});

describe('normaliseEntityAttachment', () => {
  it('accepts legacy single-identifier payload and returns isSingle=true', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({ identifierType: 'host', identifier: 'alpha' })
    );
    expect(result).toEqual({
      isSingle: true,
      attachmentLabel: undefined,
      entities: [{ identifierType: 'host', identifier: 'alpha' }],
    });
  });

  it('passes attachmentLabel through', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        identifierType: 'user',
        identifier: 'bob',
        attachmentLabel: 'Bob user',
      })
    );
    expect(result?.attachmentLabel).toBe('Bob user');
  });

  it('preserves entityStoreId on a single-entity payload', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        identifierType: 'user',
        identifier: "Lena Medhurst@Lena's MacBook Pro",
        entityStoreId: "user:Lena Medhurst@Lena's MacBook Pro@local",
      })
    );
    expect(result?.entities[0].entityStoreId).toBe("user:Lena Medhurst@Lena's MacBook Pro@local");
  });

  it('drops malformed entityStoreId on a single-entity payload', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        identifierType: 'user',
        identifier: 'bob',
        entityStoreId: 42,
      })
    );
    expect(result?.entities[0]).not.toHaveProperty('entityStoreId');
  });

  it('drops empty-string entityStoreId on a single-entity payload', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        identifierType: 'user',
        identifier: 'bob',
        entityStoreId: '',
      })
    );
    expect(result?.entities[0]).not.toHaveProperty('entityStoreId');
  });

  it('accepts multi-entity payload with entities array', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        entities: [
          { identifierType: 'host', identifier: 'alpha' },
          { identifierType: 'user', identifier: 'bob' },
        ],
      })
    );
    expect(result?.isSingle).toBe(false);
    expect(result?.entities).toHaveLength(2);
  });

  it('preserves entityStoreId on each entry of a multi-entity payload', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        entities: [
          {
            identifierType: 'host',
            identifier: 'alpha',
            entityStoreId: 'host:alpha',
          },
          {
            identifierType: 'user',
            identifier: 'bob',
            entityStoreId: 'user:bob@host@local',
          },
        ],
      })
    );
    expect(result?.entities[0].entityStoreId).toBe('host:alpha');
    expect(result?.entities[1].entityStoreId).toBe('user:bob@host@local');
  });

  it('drops malformed entityStoreId values inside a multi-entity payload', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        entities: [
          { identifierType: 'host', identifier: 'alpha', entityStoreId: null },
          { identifierType: 'user', identifier: 'bob', entityStoreId: '' },
        ],
      })
    );
    expect(result?.entities[0]).not.toHaveProperty('entityStoreId');
    expect(result?.entities[1]).not.toHaveProperty('entityStoreId');
  });

  it('marks single-element entities list as isSingle=true', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({ entities: [{ identifierType: 'service', identifier: 'svc1' }] })
    );
    expect(result?.isSingle).toBe(true);
  });

  it('filters out malformed entries in the entities array', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        entities: [
          { identifierType: 'host', identifier: 'alpha' },
          { identifierType: 'nope', identifier: 'oops' },
          { identifier: 'missing-type' },
          null,
        ],
      })
    );
    expect(result?.entities).toHaveLength(1);
    expect(result?.entities[0].identifier).toBe('alpha');
  });

  it('returns null when payload is missing', () => {
    expect(normaliseEntityAttachment(buildAttachment(null))).toBeNull();
  });

  it('returns null when neither shape is valid', () => {
    expect(normaliseEntityAttachment(buildAttachment({ foo: 'bar' }))).toBeNull();
    expect(normaliseEntityAttachment(buildAttachment({ identifierType: 'host' }))).toBeNull();
    expect(
      normaliseEntityAttachment(buildAttachment({ identifierType: 'host', identifier: '' }))
    ).toBeNull();
  });

  it('returns null when entities array is empty after filtering', () => {
    expect(normaliseEntityAttachment(buildAttachment({ entities: [{ bad: true }] }))).toBeNull();
  });

  describe('riskStats / resolutionRiskStats forwarding', () => {
    it('forwards riskStats when the payload carries a well-formed risk doc', () => {
      const riskStats = riskStatsFixture();
      const result = normaliseEntityAttachment(
        buildAttachment({
          identifierType: 'host',
          identifier: 'alpha',
          riskStats,
        })
      );
      expect(result?.riskStats).toEqual(riskStats);
      expect(result?.resolutionRiskStats).toBeUndefined();
    });

    it('forwards both primary and resolution risk stats when both are present', () => {
      const riskStats = riskStatsFixture();
      const resolutionRiskStats = riskStatsFixture({
        calculated_level: 'Critical',
        calculated_score: 90,
        calculated_score_norm: 95,
        category_1_score: 80,
        category_1_count: 10,
      });
      const result = normaliseEntityAttachment(
        buildAttachment({
          identifierType: 'host',
          identifier: 'alpha',
          riskStats,
          resolutionRiskStats,
        })
      );
      expect(result?.riskStats).toEqual(riskStats);
      expect(result?.resolutionRiskStats).toEqual(resolutionRiskStats);
    });

    it('omits riskStats when the payload does not include one', () => {
      const result = normaliseEntityAttachment(
        buildAttachment({ identifierType: 'host', identifier: 'alpha' })
      );
      expect(result?.riskStats).toBeUndefined();
      expect(result?.resolutionRiskStats).toBeUndefined();
    });

    it('ignores invalid riskStats shapes without rejecting the whole payload', () => {
      const result = normaliseEntityAttachment(
        buildAttachment({
          identifierType: 'host',
          identifier: 'alpha',
          riskStats: { calculated_level: 'High' },
          resolutionRiskStats: 'not-an-object',
        })
      );
      expect(result?.isSingle).toBe(true);
      expect(result?.riskStats).toBeUndefined();
      expect(result?.resolutionRiskStats).toBeUndefined();
    });

    it('never forwards riskStats on the multi-entity payload shape', () => {
      const result = normaliseEntityAttachment(
        buildAttachment({
          entities: [{ identifierType: 'host', identifier: 'alpha' }],
          // Even if the server (hypothetically) tacked these on, the
          // multi-entity path doesn't surface a risk breakdown today.
          riskStats: riskStatsFixture(),
        })
      );
      expect(result?.riskStats).toBeUndefined();
    });
  });
});
