/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';

describe('buildAlertBasedTilesQuery', () => {
  it('queries the correct alerts index for the given space', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'my-space');
    expect(query).toContain('FROM .alerts-security.alerts-my-space');
  });

  it('deduplicates via STATS ... BY _ea_entity_id before the LOOKUP JOIN, then renames to entity.id', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    const statsIdx = query.indexOf(
      '| STATS has_severe_alert = MAX(is_severe_alert) BY _ea_entity_id'
    );
    const renameIdx = query.indexOf('| RENAME _ea_entity_id AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(statsIdx);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('outputs the count and id columns of the three alert-based tiles', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain('severe_alerts_count');
    expect(query).toContain('severe_alerts_entity_ids');
    expect(query).toContain('watchlisted_count');
    expect(query).toContain('watchlisted_entity_ids');
    expect(query).toContain('new_alerting_count');
    expect(query).toContain('new_alerting_entity_ids');
  });

  it('counts only entities with a high or critical alert as severely alerting', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain('is_severe_alert = `kibana.alert.severity` IN ("high", "critical")');
    expect(query).toContain('severe_id = CASE(has_severe_alert, entity.id, null)');
    expect(query).toContain('severe_alerts_count      = COUNT_DISTINCT(severe_id)');
  });

  it('keeps counting watchlisted entities with an alert of any severity', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain('watchlisted_id = CASE(is_watchlisted, entity.id, null)');
    expect(query).not.toContain('CASE(is_watchlisted AND has_severe_alert');
  });

  it('aggregates the alerting records per resolved entity before the tile counts', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain(
      '| STATS has_severe_alert = MAX(has_severe_alert), is_watchlisted = MAX(is_watchlisted) BY effective_id'
    );
    expect(query).toContain('| RENAME effective_id AS `entity.id`');
  });

  it("counts new & alerting entities by the resolved entity's own first_seen", () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default', '7d');
    const renameIdx = query.indexOf('| RENAME effective_id AS `entity.id`');
    const secondJoinIdx = query.indexOf('| LOOKUP JOIN .entities-v1', renameIdx);
    const newIdx = query.indexOf('| EVAL is_new = entity.lifecycle.first_seen >= NOW() - 7 days');
    expect(secondJoinIdx).toBeGreaterThan(renameIdx);
    expect(newIdx).toBeGreaterThan(secondJoinIdx);
    expect(query).toContain('new_alerting_id = CASE(is_new, entity.id, null)');
  });

  it('applies entity filter clauses after the LOOKUP JOIN', () => {
    const filter = '| WHERE entity.type == "user"';
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default', '24h', [filter]);
    const joinIdx = query.indexOf('| LOOKUP JOIN');
    const filterIdx = query.indexOf(filter);
    expect(filterIdx).toBeGreaterThan(joinIdx);
  });

  it('uses the provided time range in the WHERE clause', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default', '7d');
    expect(query).toContain('@timestamp >= NOW() - 7 days');
  });

  it('defaults to 24h when no time range is given', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain('@timestamp >= NOW() - 1 days');
  });
});
