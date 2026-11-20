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
      '| STATS has_severe_alert = MAX(is_severe_alert), has_alert = MAX(is_alert_row), alias_watchlisted = MAX(alias_watchlisted) BY _ea_entity_id'
    );
    const renameIdx = query.indexOf('| RENAME _ea_entity_id AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(statsIdx);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('outputs the count and id columns of the two alert-based tiles', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain('severe_alerts_count');
    expect(query).toContain('severe_alerts_entity_ids');
    expect(query).toContain('watchlisted_count');
    expect(query).toContain('watchlisted_entity_ids');
  });

  it('has no new & alerting tile any more: no first_seen and no is_new', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default', '7d');
    expect(query).not.toContain('new_alerting');
    expect(query).not.toContain('is_new');
    expect(query).not.toContain('first_seen');
  });

  it('counts only entities with a high or critical alert as severely alerting', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain('is_severe_alert = `kibana.alert.severity` IN ("high", "critical")');
    expect(query).toContain('severe_id = CASE(has_severe_alert, effective_id, null)');
    expect(query).toContain('severe_alerts_count      = COUNT(severe_id)');
  });

  it('keeps counting watchlisted entities with an alert of any severity', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain(
      'watchlisted_id = CASE(has_alert AND COALESCE(group_on_watchlist, false), effective_id, null)'
    );
    expect(query).not.toContain('has_severe_alert AND');
  });

  it('aggregates the alerting records per resolved entity before the tile counts', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).toContain(
      '| STATS has_severe_alert = MAX(has_severe_alert), has_alert = MAX(has_alert), group_on_watchlist = MAX(group_on_watchlist) BY effective_id'
    );
    // The only rename is the one after the first STATS, as before.
    expect(query.match(/\| RENAME [a-z_]+ AS `entity.id`/g)).toHaveLength(1);
  });

  it('reads the alerts and the aliases together, in one FROM, not as subqueries', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    // FORK cannot run inside a FROM subquery, so the two share one FROM, like the entities grid.
    expect(query).toContain('FROM .alerts-security.alerts-default, .entities-v1 METADATA _index');
    expect(query).not.toContain('FROM (');
    // The entity docs it reads are the aliases only; the alerts leave out closed ones, as the grid.
    expect(query).toContain(
      '| WHERE (NOT _index == ".entities-v1" AND @timestamp >= NOW() - 1 days AND (kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed")) OR (_index == ".entities-v1" AND `entity.relationships.resolution.resolved_to` IS NOT NULL)'
    );
  });

  it('marks a group watchlisted from the member that alerted, an alias, or the main entity', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    // Each alias row gives its main entity as the group and whether the alias is watchlisted.
    expect(query).toContain(
      '| EVAL _ea_entity_id = `entity.relationships.resolution.resolved_to`, alias_watchlisted = entity.attributes.watchlists IS NOT NULL'
    );
    // After the join, the row is the member that alerted, or the main entity of an alias row.
    expect(query).toContain(
      'group_on_watchlist = COALESCE(alias_watchlisted, false) OR entity.attributes.watchlists IS NOT NULL'
    );
  });

  it('does not read every watchlisted entity', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default');
    expect(query).not.toContain('| WHERE entity.attributes.watchlists IS NOT NULL');
  });

  it('joins once, to the entity of each row', () => {
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default', '7d');
    expect(query.match(/\| LOOKUP JOIN/g)).toHaveLength(1);
  });

  it('applies entity filter clauses to the main entity, after the rows are grouped', () => {
    const filter = '| WHERE entity.type == "user"';
    const query = buildAlertBasedTilesQuery('.entities-v1', 'default', '24h', [filter]);
    const groupedIdx = query.indexOf('BY effective_id');
    const mainJoinIdx = query.indexOf(
      '| EVAL entity.id = effective_id\n| LOOKUP JOIN .entities-v1 ON entity.id'
    );
    const filterIdx = query.indexOf(filter);
    expect(groupedIdx).toBeGreaterThan(-1);
    expect(mainJoinIdx).toBeGreaterThan(groupedIdx);
    expect(filterIdx).toBeGreaterThan(mainJoinIdx);
    // Filtering each member before grouping would drop an alias's alert.
    expect(query.indexOf(filter)).toBe(query.lastIndexOf(filter));
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
