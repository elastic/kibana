/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';
import type { GraphTelemetryEvent } from './graph_telemetry';
import { getFiltersChangedEvent, getSearchSubmittedEvent } from './graph_telemetry';

const createFilter = (key: string): Filter => ({
  meta: { key },
  query: { match_phrase: { [key]: 'value' } },
});

describe('getFiltersChangedEvent', () => {
  it('reports "added" when the new list is longer', () => {
    expect(
      getFiltersChangedEvent([createFilter('a')], [createFilter('a'), createFilter('b')])
    ).toEqual({
      type: 'filter_changed',
      change: 'added',
    });
  });

  it('reports "removed" when the new list is shorter', () => {
    expect(
      getFiltersChangedEvent([createFilter('a'), createFilter('b')], [createFilter('a')])
    ).toEqual({
      type: 'filter_changed',
      change: 'removed',
    });
  });

  it('reports a single "removed" when all filters are cleared', () => {
    expect(
      getFiltersChangedEvent([createFilter('a'), createFilter('b'), createFilter('c')], [])
    ).toEqual({ type: 'filter_changed', change: 'removed' });
  });

  it('reports nothing when the length is unchanged (edit, disable, negate, pin)', () => {
    const disabled: Filter = { ...createFilter('a'), meta: { key: 'a', disabled: true } };
    expect(getFiltersChangedEvent([createFilter('a')], [disabled])).toBeUndefined();
  });
});

describe('getSearchSubmittedEvent', () => {
  const previous = {
    timeRange: { from: 'now-30d', to: 'now' },
    query: { query: 'event.action: "login"', language: 'kuery' } as Query,
  };

  it('reports a time range change only', () => {
    expect(
      getSearchSubmittedEvent(previous, {
        dateRange: { from: 'now-7d', to: 'now' },
        query: previous.query,
      })
    ).toEqual({ type: 'search_submitted', timeRangeChanged: true, queryChanged: false });
  });

  it('reports a query change only', () => {
    expect(
      getSearchSubmittedEvent(previous, {
        dateRange: previous.timeRange,
        query: { query: 'user.name: "alice"', language: 'kuery' },
      })
    ).toEqual({ type: 'search_submitted', timeRangeChanged: false, queryChanged: true });
  });

  it('reports both when both changed', () => {
    expect(
      getSearchSubmittedEvent(previous, {
        dateRange: { from: 'now-1h', to: 'now' },
        query: { query: '', language: 'kuery' },
      })
    ).toEqual({ type: 'search_submitted', timeRangeChanged: true, queryChanged: true });
  });

  it('reports nothing when neither the time range nor the query changed', () => {
    expect(
      getSearchSubmittedEvent(previous, { dateRange: previous.timeRange, query: previous.query })
    ).toBeUndefined();
  });

  it('treats a missing next query as the empty query', () => {
    const emptyPrevious = { ...previous, query: { query: '', language: 'kuery' } as Query };
    expect(
      getSearchSubmittedEvent(emptyPrevious, { dateRange: emptyPrevious.timeRange })
    ).toBeUndefined();
  });

  it('compares object queries by value, not identity', () => {
    const objectQuery = { query: { match_all: {} }, language: 'lucene' } as Query;
    expect(
      getSearchSubmittedEvent(
        { timeRange: previous.timeRange, query: objectQuery },
        {
          dateRange: previous.timeRange,
          query: { query: { match_all: {} }, language: 'lucene' } as Query,
        }
      )
    ).toBeUndefined();
  });
});

type IsAssignable<Candidate> = [Candidate] extends [GraphTelemetryEvent] ? true : false;

describe('GraphTelemetryEvent node_action typing', () => {
  // The tuple annotations are the assertions: if the union is loosened or tightened, the literal
  // values below stop matching their `true`/`false` types and `type_check` fails.
  it('rejects state on non-toggle actions, toggle actions without state, and invalid pairs', () => {
    const rejected: [
      IsAssignable<{
        type: 'node_action';
        nodeType: 'entity';
        action: 'show_details';
        state: 'hide';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_entity';
        action: 'show_actions_by';
        state: 'show';
      }>,
      IsAssignable<{ type: 'node_action'; nodeType: 'entity'; action: 'show_related_events' }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'event';
        action: 'show_actions_on';
        state: 'show';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_event';
        action: 'show_details';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_event';
        action: 'show_related_events';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_event';
        action: 'show_grouped_events';
        state: 'show';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'event';
        action: 'show_grouped_events';
      }>,
    ] = [false, false, false, false, false, false, false, false];

    expect(rejected).toEqual([false, false, false, false, false, false, false, false]);
  });

  it('accepts every valid node_action combination', () => {
    const accepted: [
      IsAssignable<{
        type: 'node_action';
        nodeType: 'entity';
        action: 'show_entity_relationships';
        state: 'show';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'entity';
        action: 'show_actions_by';
        state: 'hide';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'event';
        action: 'show_related_events';
        state: 'show';
      }>,
      IsAssignable<{ type: 'node_action'; nodeType: 'entity'; action: 'show_details' }>,
      IsAssignable<{ type: 'node_action'; nodeType: 'event'; action: 'show_details' }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_entity';
        action: 'show_grouped_entities';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_event';
        action: 'show_grouped_events';
      }>,
      IsAssignable<{
        type: 'node_action';
        nodeType: 'grouped_event';
        action: 'show_related_events';
        state: 'hide';
      }>,
    ] = [true, true, true, true, true, true, true, true];

    expect(accepted).toEqual([true, true, true, true, true, true, true, true]);
  });
});
