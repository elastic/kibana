/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertEntityRows } from './alert_entity_rows';

const KEEP = '`@timestamp`, _ea_entity_id';

describe('buildAlertEntityRows', () => {
  it('matches each stamped id, which also keeps alerts stamped with several ids', () => {
    const rows = buildAlertEntityRows({
      keepColumns: KEEP,
      filter: { entityIds: ['host:h1', 'user:a'] },
    }).join('\n');
    expect(rows).toContain(
      '| WHERE MV_CONTAINS(`kibana.alert.entity.id`, "host:h1") OR MV_CONTAINS(`kibana.alert.entity.id`, "user:a")'
    );
    expect(rows).not.toContain('`kibana.alert.entity.id` IN');
  });

  it('casts the stamped id, so a missing alerts index keeps the FORK branches KEYWORD', () => {
    expect(buildAlertEntityRows({ keepColumns: KEEP }).join('\n')).toContain(
      '| EVAL _ea_entity_id = `kibana.alert.entity.id`::KEYWORD'
    );
  });

  it('applies the entity store acceptance rule to the unstamped branch', () => {
    const rows = buildAlertEntityRows({ keepColumns: KEEP }).join('\n');
    expect(rows).toContain('event.outcome != "failure"');
    expect(rows).toContain('user_euid = CASE(');
  });

  it('keeps each unstamped condition its own conjunct, so ES|QL can push them down', () => {
    const where = buildAlertEntityRows({
      keepColumns: KEEP,
      guard: 'NOT is_entity',
      filter: {
        entityIds: ['host:h1'],
        unstampedIdentityClause: '(host.id == "h1")',
        unstampedIdentityPrefilter: 'host.id IN ("h1")',
      },
    })
      .join('\n')
      .split('\n')
      .find((line) => line.includes('`kibana.alert.entity.id` IS NULL'));
    expect(where).toContain('WHERE (NOT is_entity) AND `kibana.alert.entity.id` IS NULL AND (');
    expect(where).toContain(') AND (host.id IN ("h1")) AND ((host.id == "h1"))');
  });

  it('reads no unstamped alerts when the entities are narrowed to ids with no identity clause', () => {
    const rows = buildAlertEntityRows({
      keepColumns: KEEP,
      filter: { entityIds: ['host:h1'] },
    }).join('\n');
    expect(rows).toContain('WHERE false');
  });

  it('adds the guard to both alert branches and appends the extra branches', () => {
    const rows = buildAlertEntityRows({
      keepColumns: KEEP,
      guard: 'NOT is_entity',
      extraBranches: [['WHERE is_entity', '| KEEP _ea_entity_id']],
    }).join('\n');
    expect(rows).toContain('WHERE (NOT is_entity) AND `kibana.alert.entity.id` IS NOT NULL');
    expect(rows).toContain('WHERE (NOT is_entity) AND `kibana.alert.entity.id` IS NULL');
    expect(rows).toContain('WHERE is_entity');
  });

  it('ends with one single-value row per entity, leaving the rename and aggregation to callers', () => {
    const rows = buildAlertEntityRows({ keepColumns: KEEP });
    expect(rows.slice(1)).toEqual([
      '| MV_EXPAND _ea_entity_id',
      '| WHERE _ea_entity_id IS NOT NULL',
    ]);
  });
});
