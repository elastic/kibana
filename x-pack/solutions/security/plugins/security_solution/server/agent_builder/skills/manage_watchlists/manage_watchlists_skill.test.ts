/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { manageWatchlistsSkill } from './manage_watchlists_skill';

const { content } = manageWatchlistsSkill;

/**
 * Reply-content contract for the manage-watchlists skill.
 *
 * The entity-analytics agent-eval criteria for the manage-watchlists datasets score the reply,
 * not only the tool calls: the ids next to the watchlist names in an enumeration, the ~10-minute
 * sync cadence in a rule-based-data-source confirmation, and the one-time-vs-standing-query prose
 * on an entity add. Tool routing was correct in every scored family while those three obligations
 * were dropped, because each one lived inside a single example step. They are now stated once as
 * an explicit contract and repeated at the flow that owes them; this test pins both so a later
 * edit cannot quietly trim them again.
 */
const sectionBetween = (start: string, end: string): string => {
  const from = content.indexOf(start);
  if (from === -1) {
    return '';
  }
  const to = content.indexOf(end, from + start.length);
  return to === -1 ? content.slice(from) : content.slice(from, to);
};

const replyContract = sectionBetween('## Reply contract', '## Example flows');

const enumerate = sectionBetween('### Enumerate', '### Create\n');
const createAndPopulate = sectionBetween(
  '### Create and populate (headline flow)',
  '### Query-then-add flow'
);
const queryThenAdd = sectionBetween(
  '### Query-then-add flow (one-time)',
  '### Rule-based data source'
);
const storeSource = sectionBetween(
  '#### Example: the condition maps to a standard (ECS) field',
  '#### Example: the source/condition is customer-specific — ask first'
);
const indexSource = sectionBetween(
  '#### Example: the source/condition is customer-specific — ask first',
  '### Deciding one-time vs. rule-based'
);
const removeDataSource = sectionBetween(
  '### Remove a rule-based data source',
  '### Remove (manual entity)'
);

describe('manageWatchlistsSkill reply contract', () => {
  describe('contract section', () => {
    it('requires the watchlist id next to the name in an enumeration', () => {
      expect(replyContract).toContain('name and the id');
      expect(replyContract).toContain('security.list_watchlists');
    });

    it('requires the sync cadence in a rule-based data source confirmation', () => {
      expect(replyContract).toContain('roughly every 10 minutes');
    });

    it('requires the one-time-vs-standing-query prose on a one-time add', () => {
      expect(replyContract).toContain('one-time');
      expect(replyContract).toContain('security.set_watchlist_rule_based_data_source');
    });

    it('requires the follow-up prose when the add cannot follow the create in the same turn', () => {
      expect(replyContract).toContain('confirmation-gated');
      expect(replyContract).toContain('follow-up');
    });
  });

  it('enumerate flow asks for the id next to the name', () => {
    expect(enumerate).toContain('security.list_watchlists');
    expect(enumerate).toContain('name and id');
  });

  it('store-source flow states the cadence in the confirmation', () => {
    expect(storeSource).toContain('security.set_watchlist_rule_based_data_source');
    expect(storeSource).toMatch(/every 10 minutes/);
  });

  it('index-source flow states the same cadence in the confirmation', () => {
    expect(indexSource).toMatch(/every 10 minutes/);
  });

  it('remove-source flow states the cadence of the automatic cleanup', () => {
    expect(removeDataSource).toMatch(/every 10 minutes/);
  });

  it('query-then-add flow says the add is one-time and names the standing-query tool', () => {
    expect(queryThenAdd).toContain('one-time');
    expect(queryThenAdd).toContain('security.set_watchlist_rule_based_data_source');
  });

  it('create-and-populate flow defers the add to a follow-up turn', () => {
    expect(createAndPopulate).toContain('confirmation-gated');
    expect(createAndPopulate).toContain(
      'do not call `security.add_entities_to_watchlist` in this turn'
    );
    expect(createAndPopulate).toContain('follow-up');
  });
});
