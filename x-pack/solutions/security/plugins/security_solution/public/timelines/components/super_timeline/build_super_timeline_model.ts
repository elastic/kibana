/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { DataView } from '@kbn/data-plugin/common';
import type { EsQueryConfig, Filter } from '@kbn/es-query';
import { buildCombinedFilter, BooleanRelation, FilterStateStore } from '@kbn/es-query';
import { UNTITLED_TIMELINE } from '../open_timeline/translations';
import type { BrowserFields } from '../../../../common/search_strategy';
import type { ColumnHeaderOptions } from '../../../../common/types/timeline';
import type { TimelineModel } from '../../store/model';
import { timelineDefaults } from '../../store/defaults';
import { combineQueries } from '../../../common/lib/kuery';
import { SUPER_TIMELINE_TITLE, SUPER_TIMELINE_QUERY_ALIAS } from './translations';

export type SkippedQueryReason = 'eql' | 'esql' | 'unknown';

export interface SkippedQueryTimeline {
  id: string;
  title: string;
  reason: SkippedQueryReason;
}

export interface BuildSuperTimelineModelDeps {
  dataView: DataView;
  browserFields: BrowserFields;
  esQueryConfig: EsQueryConfig;
}

export interface BuildSuperTimelineModelResult {
  model: TimelineModel;
  /** Source timelines whose query type (EQL/ESQL) couldn't be merged. Their pins and notes still aggregate. */
  skippedQueryTimelines: SkippedQueryTimeline[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  val !== null && typeof val === 'object' && !Array.isArray(val);

// dateRange values can be relative (e.g. "now-7d"), absolute ISO strings, or
// numeric epoch ms (legacy saved objects store them as numbers).
const toDateMathInput = (val: string | number): string =>
  typeof val === 'number' ? new Date(val).toISOString() : val;

const parseFilterQuery = (filterQuery: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(filterQuery);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// ── Merge functions ───────────────────────────────────────────────────────────

const mergePinnedEvents = (timelines: TimelineModel[]) => {
  const pinnedEventIds: Record<string, boolean> = {};
  const pinnedEventsSaveObject: TimelineModel['pinnedEventsSaveObject'] = {};
  for (const timeline of timelines) {
    Object.assign(pinnedEventIds, timeline.pinnedEventIds);
    Object.assign(pinnedEventsSaveObject, timeline.pinnedEventsSaveObject);
  }
  return { pinnedEventIds, pinnedEventsSaveObject };
};

const mergeNotes = (timelines: TimelineModel[]) => {
  const noteIds: string[] = [];
  const seenNoteIds = new Set<string>();
  const eventIdToNoteIds: Record<string, string[]> = {};

  for (const timeline of timelines) {
    for (const noteId of timeline.noteIds) {
      if (!seenNoteIds.has(noteId)) {
        seenNoteIds.add(noteId);
        noteIds.push(noteId);
      }
    }
    for (const [eventId, ids] of Object.entries(timeline.eventIdToNoteIds)) {
      const existing = eventIdToNoteIds[eventId] ?? [];
      const merged = [...existing];
      for (const id of ids) {
        if (!merged.includes(id)) {
          merged.push(id);
        }
      }
      eventIdToNoteIds[eventId] = merged;
    }
  }
  return { noteIds, eventIdToNoteIds };
};

const mergeDateRange = (timelines: TimelineModel[]) => {
  if (timelines.length === 0) return timelineDefaults.dateRange;
  return timelines.reduce(
    (acc, timeline) => {
      const startMs =
        dateMath.parse(toDateMathInput(timeline.dateRange.start))?.valueOf() ?? Infinity;
      const endMs =
        dateMath.parse(toDateMathInput(timeline.dateRange.end), { roundUp: true })?.valueOf() ??
        -Infinity;
      const accStartMs = acc.start
        ? dateMath.parse(toDateMathInput(acc.start))?.valueOf() ?? Infinity
        : Infinity;
      const accEndMs = acc.end
        ? dateMath.parse(toDateMathInput(acc.end), { roundUp: true })?.valueOf() ?? -Infinity
        : -Infinity;
      return {
        start: startMs < accStartMs ? timeline.dateRange.start : acc.start,
        end: endMs > accEndMs ? timeline.dateRange.end : acc.end,
      };
    },
    { start: '', end: '' }
  );
};

const mergeColumns = (timelines: TimelineModel[]): ColumnHeaderOptions[] => {
  const seen = new Set<string>();
  const columns: ColumnHeaderOptions[] = [];
  for (const timeline of timelines) {
    for (const col of timeline.columns) {
      if (!seen.has(col.id)) {
        seen.add(col.id);
        columns.push(col);
      }
    }
  }
  return columns.length > 0 ? columns : timelineDefaults.defaultColumns;
};

const mergeIndexNames = (timelines: TimelineModel[]): string[] => {
  const seen = new Set<string>();
  for (const timeline of timelines) {
    for (const name of timeline.indexNames) {
      seen.add(name);
    }
  }
  return Array.from(seen);
};

// ── Query merging ─────────────────────────────────────────────────────────────

interface TimelineSubFilterResult {
  filter: Filter | null;
  skipped: SkippedQueryTimeline | null;
}

const buildTimelineSubFilter = (
  timeline: TimelineModel,
  deps: BuildSuperTimelineModelDeps
): TimelineSubFilterResult => {
  const { dataView, browserFields, esQueryConfig } = deps;
  const title = timeline.title || timeline.savedObjectId || 'Untitled Timeline';
  const id = timeline.savedObjectId ?? '';

  // Use persisted fields to identify the primary query mode — NOT activeTab, which
  // is runtime-only and always resets to TimelineTabs.query after formatTimelineResponseToModel.
  // savedSearchId is the canonical ESQL indicator; eqlOptions.query is the canonical EQL indicator.
  const isEsqlTimeline = !!timeline.savedSearchId;
  const isEqlTimeline = !isEsqlTimeline && !!timeline.eqlOptions?.query?.trim();

  if (isEqlTimeline || isEsqlTimeline) {
    return { filter: null, skipped: { id, title, reason: isEsqlTimeline ? 'esql' : 'eql' } };
  }

  const kqlQuery = {
    query: timeline.kqlQuery?.filterQuery?.kuery?.expression ?? '',
    language: timeline.kqlQuery?.filterQuery?.kuery?.kind ?? 'kuery',
  };

  const combined = combineQueries({
    config: esQueryConfig,
    dataProviders: timeline.dataProviders ?? [],
    dataView,
    browserFields,
    filters: timeline.filters ?? [],
    kqlQuery,
    kqlMode: timeline.kqlMode ?? 'filter',
  });

  if (!combined?.filterQuery) {
    return { filter: null, skipped: null };
  }

  const parsedQuery = parseFilterQuery(combined.filterQuery);
  if (parsedQuery === null) {
    // combineQueries produced valid JSON but not a plain object — internal serialization edge
    // case, not a user-authored EQL/ESQL query. Use 'unknown' so the warning toast doesn't
    // misidentify a KQL timeline as EQL.
    return { filter: null, skipped: { id, title, reason: 'unknown' } };
  }

  return {
    filter: {
      meta: {
        // alias intentionally omitted — buildCombinedFilter strips sub-filter aliases via
        // cleanUpFilter, so only the outer SUPER_TIMELINE_QUERY_ALIAS is visible.
        type: 'custom',
        disabled: false,
        negate: false,
        key: 'query',
        index: dataView.id,
      },
      query: parsedQuery,
    },
    skipped: null,
  };
};

const buildMergedFilters = (
  timelines: TimelineModel[],
  deps: BuildSuperTimelineModelDeps
): { filters: Filter[]; skippedQueryTimelines: SkippedQueryTimeline[] } => {
  const results = timelines.map((timeline) => buildTimelineSubFilter(timeline, deps));
  const subFilters = results.map((r) => r.filter).filter((f): f is Filter => f !== null);
  const skippedQueryTimelines = results
    .map((r) => r.skipped)
    .filter((s): s is SkippedQueryTimeline => s !== null);

  if (subFilters.length === 0) {
    return { filters: [], skippedQueryTimelines };
  }

  const combinedFilter = buildCombinedFilter(
    BooleanRelation.OR,
    subFilters,
    { id: deps.dataView.id },
    false,
    false,
    SUPER_TIMELINE_QUERY_ALIAS,
    FilterStateStore.APP_STATE
  );
  // Mark as multi-index so the filter bar skips per-data-view field validation.
  // The Super Timeline spans N source timelines which may use different indices,
  // so validation against any single data view will produce false ": Warning" labels.
  combinedFilter.meta.isMultiIndex = true;

  return {
    filters: [combinedFilter],
    skippedQueryTimelines,
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Merges N fully-resolved TimelineModels into a single transient Super Timeline model.
 * The returned model has `isSuperTimeline: true` and is NOT persisted — `convertTimelineAsInput`
 * is an allow-list and neither runtime-only field is included.
 */
export const buildSuperTimelineModel = (
  timelines: TimelineModel[],
  deps: BuildSuperTimelineModelDeps
): BuildSuperTimelineModelResult => {
  const { pinnedEventIds, pinnedEventsSaveObject } = mergePinnedEvents(timelines);
  const { noteIds, eventIdToNoteIds } = mergeNotes(timelines);
  const { filters, skippedQueryTimelines } = buildMergedFilters(timelines, deps);
  const dateRange = mergeDateRange(timelines);
  const columns = mergeColumns(timelines);
  const indexNames = mergeIndexNames(timelines);
  const superTimelineSources = timelines
    .filter((t): t is typeof t & { savedObjectId: string } => t.savedObjectId !== null)
    .map((t) => ({ id: t.savedObjectId, title: t.title || UNTITLED_TIMELINE }));
  const superTimelineSourceIds = superTimelineSources.map((s) => s.id);
  const superTimelineSourceTitles = superTimelineSources.map((s) => s.title);

  const superTimelineDescriptions = timelines
    .filter(
      (t): t is typeof t & { savedObjectId: string; description: string } =>
        Boolean(t.description) && t.savedObjectId !== null
    )
    .map((t) => ({
      savedObjectId: t.savedObjectId,
      title: t.title || UNTITLED_TIMELINE,
      description: t.description,
      updatedBy: t.updatedBy,
      updated: t.updated,
    }));

  const model: TimelineModel = {
    ...timelineDefaults,
    id: '',
    title: SUPER_TIMELINE_TITLE,
    pinnedEventIds,
    pinnedEventsSaveObject,
    noteIds,
    eventIdToNoteIds,
    filters,
    dataProviders: [],
    kqlQuery: { filterQuery: null },
    dateRange,
    columns,
    defaultColumns: columns,
    indexNames,
    savedObjectId: null,
    isSuperTimeline: true,
    superTimelineSourceIds,
    superTimelineSourceTitles,
    superTimelineDescriptions,
  };

  return { model, skippedQueryTimelines };
};
