/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  AnalyticsDataKind,
  AnalyticsEventSource,
  AnalyticsJourney,
  AnalyticsSourceFields,
} from '../../common/analytics';

/**
 * Field types that exist only to rank or complete search results. `semantic_text` is not among
 * them: field capabilities report it as `text` with the `inference` flag set.
 */
export const SEARCH_INTENT_FIELD_TYPES: readonly string[] = [
  'dense_vector',
  'sparse_vector',
  'rank_feature',
  'rank_features',
  'search_as_you_type',
  'completion',
];

const ANALYSED_TEXT_TYPE = 'text';

/** What the last word of an analysed text field is called when it holds content to be searched. */
const CONTENT_TEXT_FIELD =
  /(?:^|_)(?:title|name|description|body|content|text|summary|abstract|headline|subject|overview|synopsis|excerpt|caption|question|answer|transcript|plot)$/;

/** Dates that record when a document was written or changed rather than when something happened. */
const BOOKKEEPING_TIME_FIELD =
  /creat|publish|releas|updat|modif|indexed|crawl|upload|added|import|sync|edit|launch|listed|^date$/i;
/** ECS keeps event times under `event.`, whatever the rest of the name says. */
const EVENT_OBJECT_FIELD = /^event[._]/i;

/** Event names matched on a word content has too, such as a product's `name` or `type`. */
const AMBIGUOUS_ACTION_LABELS: readonly string[] = ['name', 'type'];

export interface DataKindEvidence {
  kind: AnalyticsEventSource['kind'];
  timeField: string | null;
  /** The parts the fields play in event analytics; undefined when none was recognised. */
  roles: AnalyticsSourceFields | undefined;
  hasSearchIntentField: boolean;
  hasContentText: boolean;
}

interface DataKindRule {
  id: string;
  dataKind: AnalyticsDataKind;
  matches: (evidence: DataKindEvidence) => boolean;
}

const hasEventRoles = ({ roles }: DataKindEvidence): boolean => {
  if (roles === undefined) {
    return false;
  }
  const { action, session, actors, measures } = roles;
  const hasEventName = action !== undefined && !AMBIGUOUS_ACTION_LABELS.includes(action.label);

  // Content has owners and prices too; only someone doing something measurable is an event.
  return hasEventName || session !== undefined || (actors.length > 0 && measures.length > 0);
};

const isBookkeepingTimeField = (timeField: string): boolean =>
  BOOKKEEPING_TIME_FIELD.test(timeField) && !EVENT_OBJECT_FIELD.test(timeField);

/** The first rule that matches decides, so the order runs from the strongest evidence to the weakest. */
const DATA_KIND_RULES: readonly DataKindRule[] = [
  // Vectors, semantic text and ranking features are mapped on purpose, and only to search.
  { id: 'searchIntentField', dataKind: 'search', matches: (e) => e.hasSearchIntentField },
  // A data stream is append-only and ordered by time: that is what an event stream is.
  { id: 'dataStream', dataKind: 'events', matches: (e) => e.kind === 'dataStream' },
  // Without a time to bucket on nothing can be charted over time, so it is looked up instead.
  { id: 'noTimeField', dataKind: 'search', matches: (e) => e.timeField === null },
  // An event name, a session, or an actor with something to add up describes things happening.
  { id: 'eventRoles', dataKind: 'events', matches: hasEventRoles },
  // A time that is not about the document's own life cycle says when something happened.
  {
    id: 'eventTime',
    dataKind: 'events',
    matches: (e) => e.timeField !== null && !isBookkeepingTimeField(e.timeField),
  },
  // Titles and descriptions with only a created or published date are a catalog or content.
  { id: 'contentText', dataKind: 'search', matches: (e) => e.hasContentText },
  // Weak evidence: rows with a date and nothing to search by relevance are counted and charted.
  { id: 'datedRows', dataKind: 'events', matches: () => true },
];

const toSnakeCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

const getLeafName = (name: string): string => name.slice(name.lastIndexOf('.') + 1);

/** What a source's field capabilities say about search, beyond the parts fields play in events. */
export const readSearchEvidence = (
  fields: FieldCapsResponse['fields']
): Pick<DataKindEvidence, 'hasSearchIntentField' | 'hasContentText'> => {
  const capabilities = Object.entries(fields).flatMap(([name, capabilitiesByType]) =>
    Object.entries(capabilitiesByType).map(([type, capability]) => ({ name, type, capability }))
  );

  return {
    hasSearchIntentField: capabilities.some(
      ({ type, capability }) =>
        SEARCH_INTENT_FIELD_TYPES.includes(type) ||
        capability.inference === true ||
        // Listed only when the field runs inference in some of the source's indices.
        capability.non_inference_indices !== undefined
    ),
    hasContentText: capabilities.some(
      ({ name, type }) =>
        type === ANALYSED_TEXT_TYPE && CONTENT_TEXT_FIELD.test(toSnakeCase(getLeafName(name)))
    ),
  };
};

/** The rule that decides what a source's documents are for. */
export const matchDataKindRule = (evidence: DataKindEvidence): DataKindRule =>
  DATA_KIND_RULES.find(({ matches }) => matches(evidence)) ??
  DATA_KIND_RULES[DATA_KIND_RULES.length - 1];

/** Whether a source holds events to chart or content to search, from names and types alone. */
export const classifyDataKind = (evidence: DataKindEvidence): AnalyticsDataKind =>
  matchDataKindRule(evidence).dataKind;

/**
 * The journey the classified sources call for. Sample data decides only when the deployment holds
 * nothing else, so trying a sample next to real data does not change the home. Null without sources.
 */
export const deriveJourney = (
  sources: ReadonlyArray<Pick<AnalyticsEventSource, 'dataKind' | 'isSampleData'>>
): AnalyticsJourney | null => {
  const ownSources = sources.filter(({ isSampleData }) => !isSampleData);
  const dataKinds = new Set(
    (ownSources.length > 0 ? ownSources : sources).map(({ dataKind }) => dataKind)
  );

  if (dataKinds.size === 0) {
    return null;
  }
  if (dataKinds.size > 1) {
    return 'mixed';
  }
  return dataKinds.has('events') ? 'analytics' : 'search';
};
