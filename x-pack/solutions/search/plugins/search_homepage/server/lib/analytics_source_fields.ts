/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  AnalyticsActorKind,
  AnalyticsDimensionKind,
  AnalyticsMeasureKind,
  AnalyticsSourceFields,
} from '../../common/analytics';

type FieldFamily = 'keyword' | 'integer' | 'decimal';

/**
 * Field capabilities report the type family, so `keyword` also covers `constant_keyword` and
 * `wildcard`. `unsigned_long` is left out because ES|QL cannot sum it.
 */
const FIELD_FAMILY_BY_TYPE: ReadonlyMap<string, FieldFamily> = new Map([
  ['keyword', 'keyword'],
  ['long', 'integer'],
  ['integer', 'integer'],
  ['short', 'integer'],
  ['byte', 'integer'],
  ['double', 'decimal'],
  ['float', 'decimal'],
  ['half_float', 'decimal'],
  ['scaled_float', 'decimal'],
]);
const TEXT_TYPES: readonly string[] = ['text', 'match_only_text'];
const GEO_POINT_TYPE = 'geo_point';

/** The field types a part can be read from; text only tells keyword sub-fields from plain fields. */
export const ANALYTICS_ROLE_FIELD_TYPES: readonly string[] = [
  ...FIELD_FAMILY_BY_TYPE.keys(),
  ...TEXT_TYPES,
  GEO_POINT_TYPE,
];

const MAX_ACTORS = 2;
const MAX_MEASURES = 3;
const MAX_DIMENSIONS = 4;

/** Leading objects that only wrap the event's own properties. */
const WRAPPER_SEGMENTS: readonly string[] = [
  'properties',
  'props',
  'attributes',
  'attrs',
  'context',
  'data',
  'payload',
  'fields',
  'labels',
  'params',
  'traits',
  'event_properties',
  'user_properties',
  'custom',
];

/** Trailing units of a measure, which say nothing about what is measured. */
const UNIT_TOKENS: readonly string[] = [
  'usd',
  'eur',
  'gbp',
  'cents',
  'minor',
  'ms',
  'millis',
  'milliseconds',
  'sec',
  'secs',
  'seconds',
  's',
  'ns',
  'nanos',
  'micros',
  'minutes',
  'c',
  'f',
  'celsius',
  'fahrenheit',
  'pct',
  'percent',
  'kwh',
  'kw',
  'w',
  'v',
  'mv',
  'hpa',
  'kpa',
  'psi',
  'ppm',
  'kmh',
  'mph',
  'rpm',
  'dbm',
  'native',
  'wei',
  'eth',
  'btc',
];

/** Trailing words of a name that a sentence reads better without. */
const LABEL_NOISE_TOKENS: readonly string[] = [
  'id',
  'uuid',
  'guid',
  'code',
  'name',
  'iso',
  'key',
  'number',
];

interface RoleRule<TKind extends string> {
  kind: TKind;
  families: readonly FieldFamily[];
  /** Names matched whole or as the end of a longer name, in `snake_case`, most telling first. */
  names: readonly string[];
  /** Names too common to trust as the end of a longer name. */
  exactNames?: readonly string[];
}

const KEYWORD: readonly FieldFamily[] = ['keyword'];
const IDENTIFIER: readonly FieldFamily[] = ['keyword', 'integer'];
const NUMBER: readonly FieldFamily[] = ['integer', 'decimal'];

const ACTION_RULES: ReadonlyArray<RoleRule<'action'>> = [
  {
    kind: 'action',
    families: KEYWORD,
    names: [
      'event_action',
      'event_name',
      'event_type',
      'action',
      'activity',
      'transaction_type',
      'txn_type',
      'tx_type',
      'message_type',
    ],
    exactNames: ['event', 'type', 'name'],
  },
];

/** Kinds are ordered from the most specific vocabulary to the most general. */
const ACTOR_RULES: ReadonlyArray<RoleRule<AnalyticsActorKind>> = [
  {
    kind: 'player',
    families: IDENTIFIER,
    names: ['player_id', 'player_uuid', 'player_guid', 'gamer_id'],
    exactNames: ['player'],
  },
  {
    kind: 'user',
    families: IDENTIFIER,
    names: [
      'user_id',
      'user_uuid',
      'user_guid',
      'userid',
      'distinct_id',
      'anonymous_id',
      'visitor_id',
      'user_pseudo_id',
      'amplitude_id',
      'member_id',
      'subscriber_id',
      'cookie_id',
      'client_id',
      'user_name',
      'username',
    ],
    exactNames: ['uid', 'user'],
  },
  {
    kind: 'customer',
    families: IDENTIFIER,
    names: ['customer_id', 'customer_uuid', 'buyer_id', 'payer_id', 'cardholder_id', 'shopper_id'],
    exactNames: ['customer'],
  },
  {
    kind: 'account',
    families: IDENTIFIER,
    names: [
      'account_id',
      'account_number',
      'wallet_id',
      'wallet_address',
      'from_address',
      'sender_address',
      'sender_id',
    ],
    exactNames: ['account', 'wallet'],
  },
  {
    kind: 'device',
    families: IDENTIFIER,
    names: [
      'device_id',
      'device_uuid',
      'sensor_id',
      'machine_id',
      'vehicle_id',
      'meter_id',
      'thing_id',
      'equipment_id',
      'asset_id',
      'node_id',
      'serial_number',
      'advertising_id',
      'idfa',
      'gaid',
      'ifa',
    ],
    exactNames: ['device', 'sensor'],
  },
];

const SESSION_RULES: ReadonlyArray<RoleRule<'session'>> = [
  {
    kind: 'session',
    families: IDENTIFIER,
    names: ['session_id', 'session_uuid', 'sessionid', 'session_key', 'visit_id'],
    exactNames: ['session'],
  },
];

const MEASURE_RULES: ReadonlyArray<RoleRule<AnalyticsMeasureKind>> = [
  {
    kind: 'money',
    families: NUMBER,
    names: [
      'total_amount',
      'order_total',
      'order_amount',
      'order_value',
      'transaction_value',
      'purchase_value',
      'value_usd',
      'value_eur',
      'volume_usd',
      'amount',
      'revenue',
      'total_price',
      'payout',
      'stake',
      'wager',
      'bet',
      'win_price',
      'bid_price',
      'spend',
      'cost',
      'fee',
      'price',
      'bid',
      'cpm',
      'subtotal',
    ],
    exactNames: ['total', 'sales'],
  },
  {
    kind: 'duration',
    families: NUMBER,
    names: [
      'duration',
      'latency',
      'elapsed',
      'response_time',
      'load_time',
      'time_spent',
      'time_on_page',
      'session_length',
      'play_time',
      'playtime',
      'dwell_time',
      'processing_time',
      'wait_time',
      'engagement_time',
      'ttfb',
      'delay',
    ],
    exactNames: ['took'],
  },
  {
    kind: 'generic',
    families: NUMBER,
    names: [
      'temperature',
      'humidity',
      'pressure',
      'voltage',
      'power',
      'energy',
      'speed',
      'battery_level',
      'battery',
      'rssi',
      'co2',
      'vibration',
      'flow_rate',
      'reading',
      'measurement',
      'score',
      'points',
      'xp',
      'damage',
      'quantity',
      'qty',
      'gas_used',
      'volume',
    ],
    exactNames: ['value', 'temp', 'count', 'clicks', 'impressions', 'conversions', 'bytes'],
  },
];

/** Kinds that tell one kind of event stream from another come before the ones every stream has. */
const DIMENSION_RULES: ReadonlyArray<RoleRule<AnalyticsDimensionKind>> = [
  {
    kind: 'status',
    families: KEYWORD,
    names: [
      'status',
      'outcome',
      'result',
      'decline_reason',
      'failure_reason',
      'error_code',
      'response_code',
    ],
    exactNames: ['state'],
  },
  {
    kind: 'tenant',
    families: KEYWORD,
    names: [
      'tenant_id',
      'tenant_name',
      'tenant',
      'organization_id',
      'organisation_id',
      'org_id',
      'organization_name',
      'organization',
      'workspace_id',
      'workspace',
      'company_id',
      'team_id',
    ],
    exactNames: ['org', 'company', 'team'],
  },
  {
    kind: 'merchant',
    families: KEYWORD,
    names: [
      'merchant_category',
      'mcc',
      'merchant_name',
      'merchant_id',
      'merchant',
      'store_name',
      'store_id',
      'seller',
      'vendor',
    ],
    exactNames: ['store'],
  },
  {
    kind: 'asset',
    families: KEYWORD,
    names: [
      'asset_symbol',
      'token_symbol',
      'symbol',
      'ticker',
      'trading_pair',
      'instrument',
      'blockchain',
      'chain',
      'coin',
    ],
    exactNames: ['asset', 'pair', 'network', 'side'],
  },
  {
    kind: 'game',
    families: KEYWORD,
    names: [
      'game_mode',
      'level_name',
      'level_id',
      'level',
      'map_name',
      'character_class',
      'game_name',
      'game_title',
      'game_id',
      'match_type',
      'difficulty',
      'realm',
    ],
    exactNames: ['game', 'mode', 'map', 'stage', 'character'],
  },
  {
    kind: 'ad',
    families: KEYWORD,
    names: [
      'publisher_name',
      'publisher_id',
      'publisher',
      'advertiser_name',
      'advertiser_id',
      'advertiser',
      'placement_id',
      'placement',
      'creative_id',
      'creative',
      'ad_format',
      'ad_type',
      'ad_unit',
      'ad_size',
      'exchange',
      'line_item',
      'inventory_type',
      'site_domain',
      'app_bundle',
    ],
    exactNames: ['ssp', 'dsp'],
  },
  {
    kind: 'site',
    families: KEYWORD,
    names: [
      'site_name',
      'site_id',
      'site',
      'facility',
      'plant',
      'building',
      'production_line',
      'sensor_type',
      'firmware_version',
      'firmware',
      'fleet',
      'location_name',
    ],
    exactNames: ['zone', 'room', 'line', 'model', 'location'],
  },
  {
    kind: 'campaign',
    families: KEYWORD,
    names: [
      'campaign_name',
      'utm_campaign',
      'campaign',
      'campaign_id',
      'utm_source',
      'campaign_source',
      'traffic_source',
      'utm_medium',
      'campaign_medium',
      'channel',
      'referrer_domain',
      'referring_domain',
    ],
    exactNames: ['source', 'medium'],
  },
  {
    kind: 'product',
    families: KEYWORD,
    names: [
      'product_category',
      'item_category',
      'category_name',
      'category',
      'product_name',
      'product_type',
      'item_name',
      'department',
      'brand',
      'sku',
    ],
    exactNames: ['product', 'item'],
  },
  { kind: 'currency', families: KEYWORD, names: ['currency_code', 'currency', 'ccy'] },
  {
    kind: 'paymentMethod',
    families: KEYWORD,
    names: [
      'payment_method',
      'payment_type',
      'card_brand',
      'card_type',
      'card_network',
      'card_scheme',
      'payment_provider',
      'gateway',
      'processor',
    ],
    exactNames: ['method', 'provider'],
  },
  {
    kind: 'geo',
    families: KEYWORD,
    names: [
      'country_iso_code',
      'country_code',
      'country_name',
      'country',
      'region_iso_code',
      'region_name',
      'region',
      'city_name',
      'city',
      'continent',
      'market',
    ],
  },
  {
    kind: 'device',
    families: KEYWORD,
    names: [
      'device_type',
      'device_category',
      'platform',
      'os_name',
      'operating_system',
      'browser_name',
      'browser',
      'user_agent_name',
      'device_model',
      'device_family',
      'form_factor',
    ],
    exactNames: ['os'],
  },
  {
    kind: 'segment',
    families: KEYWORD,
    names: [
      'user_segment',
      'segment',
      'plan',
      'tier',
      'cohort',
      'environment',
      'app_version',
      'language',
      'locale',
      'user_type',
    ],
    exactNames: ['env', 'version'],
  },
];

interface Candidate {
  /** The field to query. */
  name: string;
  family: FieldFamily;
  /** The name as lower-case words, without wrapper objects and a keyword sub-field suffix. */
  tokens: readonly string[];
}

interface RoleMatch<TKind extends string> {
  name: string;
  label: string;
  kind: TKind;
  rank: number;
  depth: number;
}

const tokenize = (name: string): string[] => {
  const segments = name.split('.');
  const firstOwnSegment = segments.findIndex(
    (segment, index) =>
      index === segments.length - 1 || !WRAPPER_SEGMENTS.includes(segment.toLowerCase())
  );

  return segments.slice(firstOwnSegment).flatMap((segment) =>
    segment
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token !== '')
  );
};

const getParentName = (name: string): string | undefined =>
  name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : undefined;

/**
 * Fields a query can group or aggregate on: one aggregatable type across the source's indices, not
 * a counter. A keyword sub-field of a text field stands in for that field under its name.
 */
const getCandidates = (fields: FieldCapsResponse['fields']): Candidate[] =>
  Object.entries(fields).flatMap(([name, capabilitiesByType]): Candidate[] => {
    const types = Object.entries(capabilitiesByType);
    if (types.length !== 1) {
      return [];
    }
    const [[type, capabilities]] = types;
    const family = FIELD_FAMILY_BY_TYPE.get(type);
    if (
      family === undefined ||
      !capabilities.aggregatable ||
      capabilities.metadata_field === true ||
      capabilities.time_series_metric === 'counter'
    ) {
      return [];
    }

    const parentName = getParentName(name);
    const parentTypes = parentName === undefined ? [] : Object.keys(fields[parentName] ?? {});
    const isSubField = parentTypes.some((parentType) => TEXT_TYPES.includes(parentType));

    return [{ name, family, tokens: tokenize(isSubField && parentName ? parentName : name) }];
  });

const toName = (tokens: readonly string[]): string => tokens.join('_');

/** A measure is also known by its name without a trailing unit. */
const toMeasureNames = (tokens: readonly string[]): string[] =>
  tokens.length > 1 && UNIT_TOKENS.includes(tokens[tokens.length - 1])
    ? [toName(tokens), toName(tokens.slice(0, -1))]
    : [toName(tokens)];

const toLabel = (matchedName: string): string => {
  const words = matchedName.split('_');
  const noiseStart = words.findIndex(
    (_, index) =>
      index > 0 &&
      words
        .slice(index)
        .every((word) => LABEL_NOISE_TOKENS.includes(word) || UNIT_TOKENS.includes(word))
  );

  return (noiseStart === -1 ? words : words.slice(0, noiseStart)).join(' ');
};

/** Every unused candidate a rule names, best first. */
const matchRules = <TKind extends string>(
  candidates: readonly Candidate[],
  rules: ReadonlyArray<RoleRule<TKind>>,
  usedNames: ReadonlySet<string>,
  toNames: (tokens: readonly string[]) => string[] = (tokens) => [toName(tokens)]
): Array<RoleMatch<TKind>> => {
  const patterns = rules.flatMap(({ kind, families, names, exactNames = [] }) => [
    ...names.map((name) => ({ kind, families, name, isExact: false })),
    ...exactNames.map((name) => ({ kind, families, name, isExact: true })),
  ]);

  return candidates
    .filter(({ name }) => !usedNames.has(name))
    .flatMap((candidate): Array<RoleMatch<TKind>> => {
      const candidateNames = toNames(candidate.tokens);
      // The longest name a candidate matches says most about it, whichever rule lists it.
      const [match] = patterns
        .map((pattern, rank) => ({ ...pattern, rank }))
        .filter(
          ({ families, name, isExact }) =>
            families.includes(candidate.family) &&
            candidateNames.some(
              (candidateName) =>
                candidateName === name || (!isExact && candidateName.endsWith(`_${name}`))
            )
        )
        .sort((a, b) => b.name.length - a.name.length || a.rank - b.rank);
      if (match === undefined) {
        return [];
      }
      const { kind, name, rank } = match;

      return [
        {
          name: candidate.name,
          label: toLabel(name),
          kind,
          rank,
          depth: candidate.tokens.length,
        },
      ];
    })
    .sort((a, b) => a.rank - b.rank || a.depth - b.depth || a.name.localeCompare(b.name));
};

/** The best match of each kind first, then the next best of any kind, up to the limit. */
const pickVaried = <TKind extends string>(
  matches: ReadonlyArray<RoleMatch<TKind>>,
  limit: number
): Array<RoleMatch<TKind>> => {
  const bestOfKind = matches.filter(
    ({ kind }, index) => matches.findIndex((match) => match.kind === kind) === index
  );
  const others = matches.filter((match) => !bestOfKind.includes(match));

  return [...bestOfKind, ...others].slice(0, limit);
};

const pickGeoPoint = (fields: FieldCapsResponse['fields']): string | undefined => {
  const [geoPoint] = Object.entries(fields)
    .filter(([, capabilitiesByType]) => {
      const types = Object.keys(capabilitiesByType);
      return types.length === 1 && types[0] === GEO_POINT_TYPE;
    })
    .map(([name]) => name)
    .sort((a, b) => a.split('.').length - b.split('.').length || a.localeCompare(b));

  return geoPoint;
};

/**
 * The parts a source's fields play in event analytics, read from field names and types alone, so
 * no document is looked at. A field plays one part at most. Undefined when nothing is recognised.
 */
export const detectSourceFields = (
  fields: FieldCapsResponse['fields']
): AnalyticsSourceFields | undefined => {
  const candidates = getCandidates(fields);
  const usedNames = new Set<string>();
  const claim = <TMatch extends { name: string }>(matches: TMatch[]): TMatch[] => {
    matches.forEach(({ name }) => usedNames.add(name));
    return matches;
  };

  const [action] = claim(matchRules(candidates, ACTION_RULES, usedNames).slice(0, 1));
  const actors = claim(pickVaried(matchRules(candidates, ACTOR_RULES, usedNames), MAX_ACTORS));
  const [session] = claim(matchRules(candidates, SESSION_RULES, usedNames).slice(0, 1));
  const measures = claim(
    pickVaried(matchRules(candidates, MEASURE_RULES, usedNames, toMeasureNames), MAX_MEASURES)
  );
  const dimensions = pickVaried(matchRules(candidates, DIMENSION_RULES, usedNames), MAX_DIMENSIONS);
  const geoPoint = pickGeoPoint(fields);

  if (
    action === undefined &&
    session === undefined &&
    geoPoint === undefined &&
    actors.length + measures.length + dimensions.length === 0
  ) {
    return undefined;
  }

  return {
    ...(action && { action: { name: action.name, label: action.label } }),
    actors: actors.map(({ name, label, kind }) => ({ name, label, kind })),
    ...(session && { session: { name: session.name, label: session.label } }),
    measures: measures.map(({ name, label, kind }) => ({ name, label, kind })),
    dimensions: dimensions.map(({ name, label, kind }) => ({ name, label, kind })),
    ...(geoPoint !== undefined && { geoPoint }),
  };
};
