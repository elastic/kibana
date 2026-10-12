/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/common/euid_helpers';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';
import { buildRiskMoversCountQuery } from './tile_risk_movers_query';
import { buildNewlyHighCriticalCountQuery } from './tile_newly_high_critical_query';
import { buildNewEntityCountQuery, buildNewEntityPrevCountQuery } from './new_entity_count_query';
import { pinQueryNow } from './pin_now';
import { getEntityFilterESQL, EMPTY_ENTITY_FILTERS } from './entity_filters';

const euid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (type: string, col: string) => `${col} = "${type}"`,
  },
} as unknown as EntityStoreEuid;

describe('includeIds / sampleLimit options', () => {
  const builders: Array<[string, (o: { includeIds?: boolean; sampleLimit?: number }) => string]> = [
    ['alerts', (o) => buildAlertBasedTilesQuery(euid, 'idx', 'default', undefined, [], o)],
    ['risk movers', (o) => buildRiskMoversCountQuery('default', 'idx', undefined, [], o)],
    ['newly H/C', (o) => buildNewlyHighCriticalCountQuery('default', 'idx', undefined, [], o)],
    ['new entity', (o) => buildNewEntityCountQuery('idx', '7d', [], o)],
  ];

  it.each(builders)('%s keeps VALUES by default', (_name, build) => {
    expect(build({})).toContain('VALUES(');
  });

  it.each(builders)('%s drops VALUES with includeIds false', (_name, build) => {
    expect(build({ includeIds: false })).not.toContain('VALUES(');
  });

  it.each(builders)('%s ends in a capped ranked sample with sampleLimit', (_name, build) => {
    const query = build({ sampleLimit: 20 });
    expect(query).not.toContain('VALUES(');
    expect(query).toContain('| SORT risk_score DESC NULLS LAST, effective_id ASC');
    expect(query).toContain('| LIMIT 20');
  });

  it('new entity previous query drops VALUES with includeIds false', () => {
    const query = buildNewEntityPrevCountQuery('idx', '24h', [], { includeIds: false });
    expect(query).not.toContain('VALUES(');
    expect(query).toContain('NOW() - 48 hours');
  });
});

describe('riskMoversBaseline earliest', () => {
  it('compares the latest score with the first score inside the window', () => {
    const query = buildRiskMoversCountQuery('default', 'idx', undefined, [], {
      riskMoversBaseline: 'earliest',
    });
    expect(query).toContain('FIRST(risk_score, @timestamp)');
    expect(query).not.toContain('period');
  });
});

describe('pinQueryNow', () => {
  it('replaces every NOW()', () => {
    const pinned = pinQueryNow('WHERE a >= NOW() - 24h AND b < NOW()', '2026-10-08T00:00:00.000Z');
    expect(pinned).not.toContain('NOW()');
    expect(pinned.match(/TO_DATETIME\("2026-10-08T00:00:00.000Z"\)/g)).toHaveLength(2);
  });
});

describe('getEntityFilterESQL', () => {
  it('is empty for empty filters', () => {
    expect(getEntityFilterESQL(EMPTY_ENTITY_FILTERS)).toEqual([]);
  });
});
