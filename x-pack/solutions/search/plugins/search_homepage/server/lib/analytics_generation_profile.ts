/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type {
  AggregationsAggregationContainer,
  FieldCapsResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { AnalyticsSourceFields } from '../../common/analytics';
import { DATE_FIELD_TYPES, pickTimeField } from './analytics_cluster_state';
import { ANALYTICS_ROLE_FIELD_TYPES, detectSourceFields } from './analytics_source_fields';

/** The model reads this many fields at most, the likeliest to matter first. */
export const MAX_PROFILE_FIELDS = 80;
export const MAX_TOP_VALUE_FIELDS = 12;
export const MAX_TOP_VALUES = 8;
export const MAX_NUMBER_FIELDS = 8;
export const MAX_SAMPLE_EVENTS = 2;
export const MAX_SAMPLE_EVENT_FIELDS = 40;
export const MAX_VALUE_LENGTH = 60;
/** Fields with more distinct values than this are identifiers, whose values say nothing. */
export const MAX_CATEGORICAL_VALUES = 100;
/** Value summaries read this many of each shard's documents at most. */
const SAMPLER_SHARD_SIZE = 5000;
export const RECENT_EVENTS_RANGE = 'now-7d';
export const REDACTED_VALUE = '[redacted]';

const NUMERIC_TYPES: readonly string[] = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
];
const CATEGORICAL_TYPES: readonly string[] = ['keyword', 'constant_keyword', 'boolean'];
/** Types whose values locate or identify someone whatever the field is called. */
const SENSITIVE_TYPES: readonly string[] = ['ip', 'geo_point', 'geo_shape'];

const SENSITIVE_WORDS: ReadonlySet<string> = new Set([
  'email',
  'mail',
  'token',
  'password',
  'passwd',
  'pwd',
  'secret',
  'credential',
  'credentials',
  'card',
  'pan',
  'cvv',
  'cvc',
  'iban',
  'ssn',
  'ip',
  'address',
  'addr',
  'phone',
  'mobile',
  'zip',
  'postcode',
  'postal',
  'passport',
  'birth',
  'birthday',
  'dob',
  'cookie',
  'authorization',
  'auth',
  'username',
  'surname',
  'apikey',
]);
/** `name` and `key` are sensitive only as someone's name or as a secret key. */
const SENSITIVE_NAME_OWNERS: ReadonlySet<string> = new Set([
  'user',
  'customer',
  'account',
  'person',
  'contact',
  'player',
  'owner',
  'first',
  'last',
  'full',
  'given',
  'family',
  'middle',
  'display',
]);
const SENSITIVE_KEY_OWNERS: ReadonlySet<string> = new Set(['api', 'private', 'access', 'secret']);

const toWords = (fieldName: string): string[] =>
  fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');

/** Whether a field's name says its values are personal or secret, so they never leave the cluster. */
export const isSensitiveFieldName = (fieldName: string): boolean => {
  const words = toWords(fieldName);

  return words.some((word, index) => {
    if (SENSITIVE_WORDS.has(word)) {
      return true;
    }
    const previous = words[index - 1];
    if (word === 'name') {
      return previous !== undefined && SENSITIVE_NAME_OWNERS.has(previous);
    }
    return word === 'key' && previous !== undefined && SENSITIVE_KEY_OWNERS.has(previous);
  });
};

const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/,
  /\b\d{1,3}(\.\d{1,3}){3}\b/,
  /\b(?:\d[ -]?){12,19}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}/,
  /[A-Za-z0-9+/_-]{32,}/,
];

/**
 * A document value as the model may see it: one line, cut short, and replaced altogether when it
 * looks like an address, a card number or a token whatever its field is called.
 */
export const sanitizeValue = (value: string | number | boolean): string | number | boolean => {
  if (typeof value !== 'string') {
    return value;
  }
  if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    return REDACTED_VALUE;
  }
  const singleLine = value.replace(/\s+/g, ' ').trim();

  return singleLine.length > MAX_VALUE_LENGTH
    ? `${singleLine.slice(0, MAX_VALUE_LENGTH)}…`
    : singleLine;
};

export interface ProfileField {
  name: string;
  type: string;
}

export interface ProfileTopValues {
  field: string;
  /** Most frequent first. */
  values: ReadonlyArray<string | number | boolean>;
  distinctValues: number;
}

export interface ProfileNumberRange {
  field: string;
  min: number;
  max: number;
  average: number;
}

export type ProfileSampleEvent = Record<string, string | number | boolean>;

/** What leaves the cluster about document contents; absent in schema-only mode. */
export interface ProfileValues {
  topValues: readonly ProfileTopValues[];
  /** Fields too varied to list values of, with how many distinct values they hold. */
  identifiers: ReadonlyArray<{ field: string; distinctValues: number }>;
  numbers: readonly ProfileNumberRange[];
  sampleEvents: readonly ProfileSampleEvent[];
}

export interface SourceProfile {
  source: string;
  timeField: string | null;
  /** Capped at {@link MAX_PROFILE_FIELDS}. */
  fields: readonly ProfileField[];
  totalFields: number;
  roles?: AnalyticsSourceFields;
  /** Changes whenever a field is added, removed or changes type. */
  mappingHash: string;
  /** Whether the source holds events from the period Discover and the dashboard open on. */
  hasRecentEvents: boolean;
  values?: ProfileValues;
}

const getFieldType = (capabilitiesByType: FieldCapsResponse['fields'][string]): string => {
  const types = Object.keys(capabilitiesByType);
  return types.length === 1 ? types[0] : 'conflict';
};

const isAggregatable = (capabilitiesByType: FieldCapsResponse['fields'][string]): boolean =>
  Object.values(capabilitiesByType).every(({ aggregatable }) => aggregatable);

interface DescribedField extends ProfileField {
  aggregatable: boolean;
}

/** Fields ES|QL can read; a text field with a keyword sub-field is left to its sub-field. */
const describeFields = (fields: FieldCapsResponse['fields']): DescribedField[] => {
  const names = new Set(Object.keys(fields));

  return Object.entries(fields)
    .map(([name, capabilitiesByType]) => ({
      name,
      type: getFieldType(capabilitiesByType),
      aggregatable: isAggregatable(capabilitiesByType),
    }))
    .filter(
      ({ name, type }) =>
        type !== 'conflict' &&
        !name.startsWith('_') &&
        !(['text', 'match_only_text'].includes(type) && names.has(`${name}.keyword`))
    );
};

const getRoleFieldNames = (roles: AnalyticsSourceFields | undefined): string[] =>
  roles === undefined
    ? []
    : [
        ...(roles.action ? [roles.action.name] : []),
        ...roles.dimensions.map(({ name }) => name),
        ...roles.measures.map(({ name }) => name),
        ...roles.actors.map(({ name }) => name),
        ...(roles.session ? [roles.session.name] : []),
      ];

/** Fields that play a part first, then the shallowest, so a cap cuts the least telling ones. */
const rankFields = <TField extends ProfileField>(
  fields: readonly TField[],
  roleFieldNames: readonly string[]
): TField[] => {
  const getRank = (name: string): number => {
    const roleIndex = roleFieldNames.indexOf(name);
    return roleIndex === -1 ? roleFieldNames.length : roleIndex;
  };

  return [...fields].sort(
    (a, b) =>
      getRank(a.name) - getRank(b.name) ||
      a.name.split('.').length - b.name.split('.').length ||
      a.name.localeCompare(b.name)
  );
};

export const hashMapping = (fields: readonly ProfileField[]): string =>
  createHash('sha256')
    .update(
      fields
        .map(({ name, type }) => `${name}:${type}`)
        .sort()
        .join('\n')
    )
    .digest('hex');

const canShareValues = ({ name, type }: ProfileField): boolean =>
  !SENSITIVE_TYPES.includes(type) && !isSensitiveFieldName(name);

interface ValueAggregations {
  sample?: {
    doc_count: number;
    [key: string]:
      | number
      | { buckets?: Array<{ key: string | number; key_as_string?: string }> }
      | { value?: number }
      | { min?: number | null; max?: number | null; avg?: number | null };
  };
}

const readNumber = (value: number | null | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toSampleEvent = (
  hitFields: Record<string, Array<string | number | boolean | object>> | undefined,
  fieldNames: readonly string[]
): ProfileSampleEvent =>
  fieldNames.reduce<ProfileSampleEvent>((event, name) => {
    const [value] = hitFields?.[name] ?? [];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return { ...event, [name]: sanitizeValue(value) };
    }
    return event;
  }, {});

export const getRecentEventsFilter = (
  timeField: string | null
): QueryDslQueryContainer | undefined =>
  timeField === null
    ? undefined
    : { range: { [timeField]: { gte: RECENT_EVENTS_RANGE, lte: 'now' } } };

interface FetchValuesParams {
  client: IScopedClusterClient;
  source: string;
  timeField: string | null;
  topValueFields: readonly ProfileField[];
  numberFields: readonly ProfileField[];
  sampleFields: readonly ProfileField[];
  filter: QueryDslQueryContainer | undefined;
  withValues: boolean;
}

const fetchValues = async ({
  client,
  source,
  timeField,
  topValueFields,
  numberFields,
  sampleFields,
  filter,
  withValues,
}: FetchValuesParams): Promise<{ total: number; values?: ProfileValues }> => {
  const valueAggs: Record<string, AggregationsAggregationContainer> = {
    ...Object.fromEntries(
      topValueFields.flatMap(({ name }, index) => [
        [`top_${index}`, { terms: { field: name, size: MAX_TOP_VALUES } }],
        [`distinct_${index}`, { cardinality: { field: name } }],
      ])
    ),
    ...Object.fromEntries(
      numberFields.map(({ name }, index) => [`number_${index}`, { stats: { field: name } }])
    ),
  };
  const hasValueAggs = withValues && Object.keys(valueAggs).length > 0;

  const { hits, aggregations } = await client.asCurrentUser.search<never, ValueAggregations>({
    index: source,
    size: withValues ? MAX_SAMPLE_EVENTS : 0,
    track_total_hits: true,
    ...(filter && { query: filter }),
    ...(withValues && {
      _source: false,
      fields: sampleFields.map(({ name }) => name),
      ...(timeField !== null && {
        sort: [{ [timeField]: { order: 'desc' as const, unmapped_type: 'date' } }],
      }),
    }),
    ...(hasValueAggs && {
      aggs: { sample: { sampler: { shard_size: SAMPLER_SHARD_SIZE }, aggs: valueAggs } },
    }),
  });
  const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;
  if (!withValues) {
    return { total };
  }

  const sample = aggregations?.sample;
  const described = topValueFields.map(({ name }, index) => {
    const top = sample?.[`top_${index}`];
    const distinct = sample?.[`distinct_${index}`];
    const buckets = typeof top === 'object' && 'buckets' in top ? top.buckets ?? [] : [];
    const distinctValues =
      typeof distinct === 'object' && 'value' in distinct ? distinct.value ?? 0 : 0;

    return {
      field: name,
      distinctValues,
      values: buckets.map(({ key, key_as_string: keyAsString }) =>
        sanitizeValue(keyAsString ?? key)
      ),
    };
  });

  return {
    total,
    values: {
      topValues: described.filter(
        ({ values, distinctValues }) =>
          values.length > 0 && distinctValues <= MAX_CATEGORICAL_VALUES
      ),
      identifiers: described
        .filter(({ distinctValues }) => distinctValues > MAX_CATEGORICAL_VALUES)
        .map(({ field, distinctValues }) => ({ field, distinctValues })),
      numbers: numberFields.flatMap(({ name }, index) => {
        const stats = sample?.[`number_${index}`];
        if (typeof stats !== 'object' || !('min' in stats)) {
          return [];
        }
        const min = readNumber(stats.min);
        const max = readNumber(stats.max);
        const average = readNumber(stats.avg);

        return min === undefined || max === undefined || average === undefined
          ? []
          : [{ field: name, min, max, average: Math.round(average * 100) / 100 }];
      }),
      sampleEvents: hits.hits
        .map(({ fields: hitFields }) =>
          toSampleEvent(
            hitFields,
            sampleFields.map(({ name }) => name)
          )
        )
        .filter((event) => Object.keys(event).length > 0),
    },
  };
};

export interface SourceSchema
  extends Pick<
    SourceProfile,
    'source' | 'timeField' | 'fields' | 'totalFields' | 'roles' | 'mappingHash'
  > {
  /** Fields whose values may be read for the model, the likeliest to matter first. */
  shareableFields: readonly DescribedField[];
}

/**
 * The fields of an event source and the parts they play, from one field capabilities request made
 * as the caller. No document is read.
 */
export const fetchSourceSchema = async ({
  client,
  source,
  timeField: requestedTimeField,
}: {
  client: IScopedClusterClient;
  source: string;
  /** The time field the caller already detected; used when the source has it as a date field. */
  timeField?: string;
}): Promise<SourceSchema> => {
  const { fields: fieldCaps = {} } = await client.asCurrentUser.fieldCaps({
    index: source,
    fields: '*',
    // ES|QL cannot read nested fields, and objects and metadata fields play no part.
    filters: '-metadata,-parent,-nested',
    filter_path: ['fields'],
  });

  const roleTypes = [...DATE_FIELD_TYPES, ...ANALYTICS_ROLE_FIELD_TYPES];
  const roleFieldCaps = Object.fromEntries(
    Object.entries(fieldCaps).filter(([, capabilitiesByType]) =>
      Object.keys(capabilitiesByType).every((type) => roleTypes.includes(type))
    )
  );
  const roles = detectSourceFields(roleFieldCaps);
  const isDateField = (name: string): boolean =>
    DATE_FIELD_TYPES.some((type) => fieldCaps[name]?.[type] !== undefined);
  const allFields = describeFields(fieldCaps);
  const rankedFields = rankFields(allFields, getRoleFieldNames(roles));

  return {
    source,
    timeField:
      requestedTimeField !== undefined && isDateField(requestedTimeField)
        ? requestedTimeField
        : pickTimeField(roleFieldCaps),
    fields: rankedFields.slice(0, MAX_PROFILE_FIELDS).map(({ name, type }) => ({ name, type })),
    totalFields: allFields.length,
    ...(roles && { roles }),
    mappingHash: hashMapping(allFields),
    shareableFields: rankedFields.filter(canShareValues),
  };
};

/**
 * What a model is told about an event source: its schema and, unless values are withheld, one
 * search made as the caller for the most frequent values of categorical fields, the range of
 * numeric ones and the latest events. Values of fields whose name or type marks them as personal
 * or secret are never read.
 */
export const fetchSourceProfile = async ({
  client,
  schema: { shareableFields, ...schema },
  withValues,
}: {
  client: IScopedClusterClient;
  schema: SourceSchema;
  /** When false, no document value is read for the model: field names and types only. */
  withValues: boolean;
}): Promise<SourceProfile> => {
  const { source, timeField } = schema;
  const valueParams = {
    client,
    source,
    timeField,
    topValueFields: shareableFields
      .filter(({ type, aggregatable }) => aggregatable && CATEGORICAL_TYPES.includes(type))
      .slice(0, MAX_TOP_VALUE_FIELDS),
    numberFields: shareableFields
      .filter(({ type, aggregatable }) => aggregatable && NUMERIC_TYPES.includes(type))
      .slice(0, MAX_NUMBER_FIELDS),
    sampleFields: shareableFields.slice(0, MAX_SAMPLE_EVENT_FIELDS),
    withValues,
  };

  const recent = await fetchValues({ ...valueParams, filter: getRecentEventsFilter(timeField) });
  const hasRecentEvents = recent.total > 0;
  // A source whose events are all older is still described, from all of its events.
  const { values } =
    hasRecentEvents || !withValues || timeField === null
      ? recent
      : await fetchValues({ ...valueParams, filter: undefined });

  return { ...schema, hasRecentEvents, ...(values && { values }) };
};
