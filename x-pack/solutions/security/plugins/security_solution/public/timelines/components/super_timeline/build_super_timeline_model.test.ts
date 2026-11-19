/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { isCombinedFilter, BooleanRelation } from '@kbn/es-query';
import type { CombinedFilter } from '@kbn/es-query';
import type { ColumnHeaderOptions } from '../../../../common/types/timeline';
import type { DataProvider } from '../../../../common/types';
import type { TimelineModel } from '../../store/model';
import { timelineDefaults } from '../../store/defaults';
import { buildSuperTimelineModel } from './build_super_timeline_model';
import { SUPER_TIMELINE_TITLE, SUPER_TIMELINE_QUERY_ALIAS } from './translations';
import * as kuery from '../../../common/lib/kuery';

const mockDataView = createStubDataView({ spec: { id: 'mock-data-view' } });
const mockBrowserFields = {};
const mockEsQueryConfig = { allowLeadingWildcards: true, queryStringOptions: {} };

const deps = {
  dataView: mockDataView,
  browserFields: mockBrowserFields,
  esQueryConfig: mockEsQueryConfig,
};

/** Builds a minimal TimelineModel for testing */
const makeTimeline = (overrides: Partial<TimelineModel>): TimelineModel => ({
  ...(timelineDefaults as unknown as TimelineModel),
  id: 'timeline-1',
  savedObjectId: 'saved-obj-1',
  title: 'Timeline 1',
  pinnedEventIds: {},
  pinnedEventsSaveObject: {},
  noteIds: [],
  eventIdToNoteIds: {},
  dataProviders: [],
  kqlQuery: { filterQuery: null },
  filters: [],
  dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-02T00:00:00.000Z' },
  columns: [],
  defaultColumns: timelineDefaults.defaultColumns,
  indexNames: ['logs-*'],
  eqlOptions: {
    eventCategoryField: 'event.category',
    timestampField: '@timestamp',
    query: '',
    size: 100,
  },
  savedSearchId: null,
  savedSearch: null,
  ...overrides,
});

describe('buildSuperTimelineModel', () => {
  describe('basic structure', () => {
    it('returns a model with isSuperTimeline: true and SUPER_TIMELINE_TITLE', () => {
      const model = buildSuperTimelineModel([makeTimeline({})], deps);
      expect(model.isSuperTimeline).toBe(true);
      expect(model.title).toBe(SUPER_TIMELINE_TITLE);
    });

    it('carries the source savedObjectIds in superTimelineSourceIds', () => {
      const t1 = makeTimeline({ savedObjectId: 'id-a' });
      const t2 = makeTimeline({ savedObjectId: 'id-b' });
      const model = buildSuperTimelineModel([t1, t2], deps);
      expect(model.superTimelineSourceIds).toEqual(['id-a', 'id-b']);
    });

    it('sets savedObjectId to null (transient, never persisted)', () => {
      const model = buildSuperTimelineModel([makeTimeline({})], deps);
      expect(model.savedObjectId).toBeNull();
    });

    it('clears dataProviders and kqlQuery (query lives in CombinedFilter)', () => {
      const dataProvider: DataProvider = {
        id: 'dp-1',
        name: 'host',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: { field: 'host.name', value: 'foo', operator: ':' },
        and: [],
      };
      const t = makeTimeline({
        dataProviders: [dataProvider],
        kqlQuery: {
          filterQuery: {
            kuery: { kind: 'kuery', expression: 'host.name: foo' },
            serializedQuery: '',
          },
        },
      });
      const model = buildSuperTimelineModel([t], deps);
      expect(model.dataProviders).toEqual([]);
      expect(model.kqlQuery.filterQuery).toBeNull();
    });

    it('returns an empty model when no timelines are provided', () => {
      const model = buildSuperTimelineModel([], deps);
      expect(model.isSuperTimeline).toBe(true);
      expect(model.superTimelineSourceIds).toEqual([]);
      // dateRange must be the safe default, not empty strings that break the time-range picker
      expect(model.dateRange).toEqual(timelineDefaults.dateRange);
    });
  });

  describe('pinned event union', () => {
    it('unions pinned events across timelines', () => {
      const t1 = makeTimeline({ pinnedEventIds: { 'event-a': true, 'event-b': true } });
      const t2 = makeTimeline({ pinnedEventIds: { 'event-c': true } });
      const model = buildSuperTimelineModel([t1, t2], deps);
      expect(model.pinnedEventIds).toEqual({
        'event-a': true,
        'event-b': true,
        'event-c': true,
      });
    });

    it('deduplicates overlapping pinned events without duplicating the entry', () => {
      const t1 = makeTimeline({ pinnedEventIds: { 'event-shared': true } });
      const t2 = makeTimeline({ pinnedEventIds: { 'event-shared': true } });
      const model = buildSuperTimelineModel([t1, t2], deps);
      // Record deduplication: key exists once
      expect(Object.keys(model.pinnedEventIds)).toHaveLength(1);
      expect(model.pinnedEventIds['event-shared']).toBe(true);
    });
  });

  describe('note union (reference-only, no duplication)', () => {
    it('unions noteIds across timelines without duplicating shared notes', () => {
      const t1 = makeTimeline({ noteIds: ['note-1', 'note-shared'] });
      const t2 = makeTimeline({ noteIds: ['note-2', 'note-shared'] });
      const model = buildSuperTimelineModel([t1, t2], deps);
      // note-shared appears once
      expect(model.noteIds).toEqual(['note-1', 'note-shared', 'note-2']);
    });

    it('merges eventIdToNoteIds without duplicating note references on shared events', () => {
      const t1 = makeTimeline({ eventIdToNoteIds: { 'event-x': ['note-1', 'note-shared'] } });
      const t2 = makeTimeline({ eventIdToNoteIds: { 'event-x': ['note-2', 'note-shared'] } });
      const model = buildSuperTimelineModel([t1, t2], deps);
      const notes = model.eventIdToNoteIds['event-x'];
      expect(notes).toContain('note-1');
      expect(notes).toContain('note-2');
      expect(notes).toContain('note-shared');
      // note-shared must appear only once
      expect(notes.filter((n) => n === 'note-shared')).toHaveLength(1);
    });

    it('combines eventIdToNoteIds from separate events', () => {
      const t1 = makeTimeline({ eventIdToNoteIds: { 'event-a': ['note-1'] } });
      const t2 = makeTimeline({ eventIdToNoteIds: { 'event-b': ['note-2'] } });
      const model = buildSuperTimelineModel([t1, t2], deps);
      expect(model.eventIdToNoteIds['event-a']).toEqual(['note-1']);
      expect(model.eventIdToNoteIds['event-b']).toEqual(['note-2']);
    });
  });

  describe('date range union', () => {
    it('sets the earliest start and latest end across all timelines', () => {
      const t1 = makeTimeline({
        dateRange: { start: '2024-01-03T00:00:00.000Z', end: '2024-01-05T00:00:00.000Z' },
      });
      const t2 = makeTimeline({
        dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-07T00:00:00.000Z' },
      });
      const t3 = makeTimeline({
        dateRange: { start: '2024-01-02T00:00:00.000Z', end: '2024-01-06T00:00:00.000Z' },
      });
      const model = buildSuperTimelineModel([t1, t2, t3], deps);
      expect(model.dateRange.start).toBe('2024-01-01T00:00:00.000Z');
      expect(model.dateRange.end).toBe('2024-01-07T00:00:00.000Z');
    });

    it('correctly unions relative date strings (now-7d is earlier than now-24h)', () => {
      // Lexicographic comparison gets this wrong: '7' > '2', so 'now-7d' < 'now-24h' is
      // false by char code, but now-7d is actually an earlier point in time than now-24h.
      const t1 = makeTimeline({ dateRange: { start: 'now-24h', end: 'now' } });
      const t2 = makeTimeline({ dateRange: { start: 'now-7d', end: 'now' } });
      const model = buildSuperTimelineModel([t1, t2], deps);
      // now-7d is earlier, so it should win as the start
      expect(model.dateRange.start).toBe('now-7d');
      expect(model.dateRange.end).toBe('now');
    });

    it('unions mixed ISO and relative date strings correctly', () => {
      // ISO 2020-01-01 is always earlier than now-7d; ISO end 2021-01-01 is always earlier
      // than now. Verifies that ISO and relative strings can be compared across types.
      const t1 = makeTimeline({
        dateRange: { start: '2020-01-01T00:00:00.000Z', end: '2021-01-01T00:00:00.000Z' },
      });
      const t2 = makeTimeline({ dateRange: { start: 'now-7d', end: 'now' } });
      const model = buildSuperTimelineModel([t1, t2], deps);
      expect(model.dateRange.start).toBe('2020-01-01T00:00:00.000Z');
      expect(model.dateRange.end).toBe('now');
    });

    it('handles legacy numeric epoch values in dateRange (stored before ISO migration)', () => {
      // Legacy saved objects persisted dateRange.start/end as epoch ms numbers.
      // See SavedDateRangePickerRuntimeType comment in common/types/timeline/saved_object.ts.
      const EPOCH_JAN_2022 = new Date('2022-01-01T00:00:00.000Z').getTime(); // 1640995200000
      const EPOCH_JAN_2024 = new Date('2024-01-01T00:00:00.000Z').getTime(); // 1704067200000
      const t1 = makeTimeline({
        // cast via unknown to simulate legacy numeric values reaching the model
        dateRange: {
          start: EPOCH_JAN_2022 as unknown as string,
          end: EPOCH_JAN_2022 as unknown as string,
        },
      });
      const t2 = makeTimeline({
        dateRange: {
          start: EPOCH_JAN_2024 as unknown as string,
          end: EPOCH_JAN_2024 as unknown as string,
        },
      });
      // t1 has the earlier start, t2 has the later end
      const model = buildSuperTimelineModel([t1, t2], deps);
      expect(model.dateRange.start).toBe(EPOCH_JAN_2022 as unknown as string);
      expect(model.dateRange.end).toBe(EPOCH_JAN_2024 as unknown as string);
    });
  });

  describe('column union', () => {
    const col = (id: string): ColumnHeaderOptions => ({
      id,
      columnHeaderType: 'not-filtered',
      initialWidth: 100,
    });

    it('unions columns in first-seen order without duplicates', () => {
      const t1 = makeTimeline({ columns: [col('@timestamp'), col('host.name')] });
      const t2 = makeTimeline({ columns: [col('host.name'), col('user.name')] });
      const model = buildSuperTimelineModel([t1, t2], deps);
      expect(model.columns.map((c) => c.id)).toEqual(['@timestamp', 'host.name', 'user.name']);
    });

    it('falls back to defaultColumns when all source timelines have no columns', () => {
      const t1 = makeTimeline({ columns: [] });
      const model = buildSuperTimelineModel([t1], deps);
      expect(model.columns).toEqual(timelineDefaults.defaultColumns);
    });
  });

  describe('query merging — CombinedFilter', () => {
    it('produces one CombinedFilter with OR relation when timelines have KQL queries', () => {
      // Timelines with only filters (no KQL expression, no data providers) — combineQueries
      // returns a result when filters are non-empty
      const t1 = makeTimeline({
        title: 'Timeline A',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              params: { query: 'foo' },
            },
            query: { match_phrase: { 'host.name': 'foo' } },
          },
        ],
      });
      const t2 = makeTimeline({
        title: 'Timeline B',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              params: { query: 'bar' },
            },
            query: { match_phrase: { 'host.name': 'bar' } },
          },
        ],
      });

      const model = buildSuperTimelineModel([t1, t2], deps);

      expect(model.filters).toHaveLength(1);
      const combinedRaw = model.filters![0];
      expect(isCombinedFilter(combinedRaw)).toBe(true);
      const combined = combinedRaw as CombinedFilter;
      expect(combined.meta.relation).toBe(BooleanRelation.OR);
      expect(combined.meta.alias).toBe(SUPER_TIMELINE_QUERY_ALIAS);
      // One sub-filter per source timeline
      expect(combined.meta.params).toHaveLength(2);
    });

    it('produces the correct number of sub-filters for each source timeline', () => {
      // Note: buildCombinedFilter calls cleanUpFilter on each sub-filter, which strips meta.alias.
      // Individual sub-filters are identifiable by their DSL content, not by alias. The top-level
      // CombinedFilter pill is labelled via SUPER_TIMELINE_QUERY_ALIAS (tested above).
      const t1 = makeTimeline({
        title: 'Endpoint Investigation',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'process.name',
              params: { query: 'cmd.exe' },
            },
            query: { match_phrase: { 'process.name': 'cmd.exe' } },
          },
        ],
      });
      const t2 = makeTimeline({
        title: 'Network Investigation',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'network.direction',
              params: { query: 'egress' },
            },
            query: { match_phrase: { 'network.direction': 'egress' } },
          },
        ],
      });

      const model = buildSuperTimelineModel([t1, t2], deps);

      const combined = model.filters![0];
      // One sub-filter per source timeline
      expect(combined.meta.params).toHaveLength(2);
    });

    it('produces no filters when all timelines have empty queries', () => {
      const t1 = makeTimeline({ dataProviders: [], kqlQuery: { filterQuery: null }, filters: [] });
      const model = buildSuperTimelineModel([t1], deps);
      expect(model.filters).toHaveLength(0);
    });

    it('produces no filter clause when combineQueries returns non-plain-object JSON (internal edge case)', () => {
      // WHY: combineQueries may (theoretically) serialize to a JSON array or primitive in edge cases.
      // The timeline is still included (pins/notes/dateRange), but the malformed filter is dropped silently.
      const spy = jest.spyOn(kuery, 'combineQueries').mockReturnValueOnce({
        filterQuery: JSON.stringify([1, 2, 3]),
        kqlError: undefined,
        baseKqlQuery: { query: '', language: 'kuery' },
      });
      const t = makeTimeline({
        savedObjectId: 'kql-bad-serialize',
        title: 'Bad Serialize',
        filters: [],
      });
      const model = buildSuperTimelineModel([t], deps);
      expect(model.filters).toHaveLength(0);
      spy.mockRestore();
    });
  });

  describe('EQL / ESQL handling — queries are disregarded, Query-tab state is used', () => {
    it('an EQL timeline with an empty Query tab contributes no query clause but still merges its pins and notes', () => {
      // WHY: the product requirement is to "utilize the main timeline query" and disregard EQL/ES|QL.
      // An EQL timeline with no Query-tab content should produce no filter clause — same as a KQL
      // timeline with an empty Query tab — but its pinned events and notes must still aggregate.
      const eqlTimeline = makeTimeline({
        savedObjectId: 'eql-empty-query-tab',
        title: 'EQL Investigation',
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: 'process where process.name == "cmd.exe"',
          size: 100,
        },
        dataProviders: [],
        kqlQuery: { filterQuery: null },
        filters: [],
        pinnedEventIds: { 'pinned-from-eql': true },
        noteIds: ['note-from-eql'],
      });

      const model = buildSuperTimelineModel([eqlTimeline], deps);

      // No query clause contributed (empty Query tab)
      expect(model.filters).toHaveLength(0);
      // Pins and notes still aggregate
      expect(model.pinnedEventIds['pinned-from-eql']).toBe(true);
      expect(model.noteIds).toContain('note-from-eql');
    });

    it('an ES|QL timeline with an empty Query tab contributes no query clause but still merges its pins and notes', () => {
      const esqlTimeline = makeTimeline({
        savedObjectId: 'esql-empty-query-tab',
        title: 'ESQL Investigation',
        savedSearchId: 'some-saved-search-id',
        dataProviders: [],
        kqlQuery: { filterQuery: null },
        filters: [],
        pinnedEventIds: { 'pinned-from-esql': true },
        noteIds: ['note-from-esql'],
      });

      const model = buildSuperTimelineModel([esqlTimeline], deps);

      expect(model.filters).toHaveLength(0);
      expect(model.pinnedEventIds['pinned-from-esql']).toBe(true);
      expect(model.noteIds).toContain('note-from-esql');
    });

    it('an EQL timeline WITH a populated Query tab merges that KQL query into the OR filter', () => {
      // WHY: "utilize the main timeline query" — if an EQL-mode timeline also has a Query-tab
      // filter, that filter must be merged. The EQL expression itself is never surfaced.
      const eqlWithKqlFilter = makeTimeline({
        savedObjectId: 'eql-with-query-tab',
        title: 'EQL + Query tab',
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: 'process where process.name == "cmd.exe"',
          size: 100,
        },
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              params: { query: 'web' },
            },
            query: { match_phrase: { 'host.name': 'web' } },
          },
        ],
      });

      const model = buildSuperTimelineModel([eqlWithKqlFilter], deps);

      // Query-tab filter merged
      expect(model.filters).toHaveLength(1);
      expect(isCombinedFilter(model.filters![0])).toBe(true);
      // The EQL expression must not appear anywhere in the filter
      expect(JSON.stringify(model.filters)).not.toContain('process.name');
      expect(JSON.stringify(model.filters)).not.toContain('cmd.exe');
    });

    it('an ES|QL timeline WITH a populated Query tab merges that KQL query into the OR filter', () => {
      const esqlWithKqlFilter = makeTimeline({
        savedObjectId: 'esql-with-query-tab',
        title: 'ES|QL + Query tab',
        savedSearchId: 'some-saved-search-id',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'event.category',
              params: { query: 'process' },
            },
            query: { match_phrase: { 'event.category': 'process' } },
          },
        ],
      });

      const model = buildSuperTimelineModel([esqlWithKqlFilter], deps);

      expect(model.filters).toHaveLength(1);
      // savedSearchId must not leak into the merged model
      expect(model.savedSearchId).toBeNull();
    });

    it('mixes a KQL timeline and an EQL timeline with empty Query tab — only KQL contributes a clause', () => {
      const kqlTimeline = makeTimeline({
        savedObjectId: 'kql-tl',
        title: 'KQL Timeline',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'host.name',
              params: { query: 'web' },
            },
            query: { match_phrase: { 'host.name': 'web' } },
          },
        ],
      });
      const eqlTimeline = makeTimeline({
        savedObjectId: 'eql-tl',
        title: 'EQL Timeline',
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: 'any where true',
          size: 100,
        },
        dataProviders: [],
        kqlQuery: { filterQuery: null },
        filters: [],
      });

      const model = buildSuperTimelineModel([kqlTimeline, eqlTimeline], deps);

      // Only the KQL timeline produces a sub-filter; EQL's empty Query tab contributes nothing
      expect(model.filters).toHaveLength(1);
      expect(isCombinedFilter(model.filters![0])).toBe(true);
      expect((model.filters![0].meta.params as unknown[]).length).toBe(1);
      // EQL expression must not appear in the filter
      expect(JSON.stringify(model.filters)).not.toContain('any where true');
    });

    it('an all-EQL selection produces an empty filter (same as a fresh timeline with no query)', () => {
      // WHY: when every selected timeline is EQL/ES|QL with an empty Query tab, the merged
      // filter is empty. That is accepted — it degenerates to "all events in the merged date
      // range", the same state a plain timeline with no query has today.
      const eql1 = makeTimeline({
        savedObjectId: 'eql-1',
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: 'process where true',
          size: 100,
        },
        dataProviders: [],
        kqlQuery: { filterQuery: null },
        filters: [],
      });
      const eql2 = makeTimeline({
        savedObjectId: 'eql-2',
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: 'network where true',
          size: 100,
        },
        dataProviders: [],
        kqlQuery: { filterQuery: null },
        filters: [],
      });

      const model = buildSuperTimelineModel([eql1, eql2], deps);

      expect(model.filters).toHaveLength(0);
      expect(model.isSuperTimeline).toBe(true);
    });

    it('neither eqlOptions.query nor savedSearchId appears in the built Super Timeline model', () => {
      // WHY: EQL and ES|QL query text must not leak into the Super Timeline — it would open
      // the wrong tab or fire the wrong query type in the timeline modal.
      const eqlTimeline = makeTimeline({
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: 'process where process.name == "secret.exe"',
          size: 100,
        },
        savedSearchId: null,
      });
      const esqlTimeline = makeTimeline({
        savedSearchId: 'super-secret-saved-search',
        eqlOptions: {
          eventCategoryField: 'event.category',
          timestampField: '@timestamp',
          query: '',
          size: 100,
        },
      });

      const model = buildSuperTimelineModel([eqlTimeline, esqlTimeline], deps);

      expect(model.savedSearchId).toBeNull();
      const modelJson = JSON.stringify(model);
      expect(modelJson).not.toContain('secret.exe');
      expect(modelJson).not.toContain('super-secret-saved-search');
    });
  });
});
