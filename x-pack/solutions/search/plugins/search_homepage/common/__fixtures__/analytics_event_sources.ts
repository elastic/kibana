/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { AnalyticsDataKind, AnalyticsEventSource, AnalyticsSourceFields } from '../analytics';

type Properties = Record<string, MappingProperty>;

export interface EventSourceFixture {
  id: string;
  properties: Properties;
  timeField: string | null;
  /** What detection is expected to make of the mapping. */
  fields: AnalyticsSourceFields | undefined;
  /** Events unless stated. */
  dataKind?: AnalyticsDataKind;
}

const keyword: MappingProperty = { type: 'keyword' };
/** How dynamic mapping stores a string. */
const dynamicString: MappingProperty = {
  type: 'text',
  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
};

/** The type families field capabilities report, for the types the cluster state asks for. */
const FIELD_CAPS_TYPES: ReadonlyMap<string, string> = new Map([
  ['keyword', 'keyword'],
  ['constant_keyword', 'keyword'],
  ['wildcard', 'keyword'],
  ['text', 'text'],
  ['match_only_text', 'text'],
  ['long', 'long'],
  ['integer', 'integer'],
  ['short', 'short'],
  ['byte', 'byte'],
  ['double', 'double'],
  ['float', 'float'],
  ['half_float', 'half_float'],
  ['scaled_float', 'scaled_float'],
  ['date', 'date'],
  ['date_nanos', 'date_nanos'],
  ['geo_point', 'geo_point'],
  ['semantic_text', 'text'],
  ['dense_vector', 'dense_vector'],
  ['sparse_vector', 'sparse_vector'],
  ['rank_feature', 'rank_feature'],
  ['rank_features', 'rank_features'],
  ['search_as_you_type', 'search_as_you_type'],
  ['completion', 'completion'],
]);
const NON_AGGREGATABLE_TYPES: readonly string[] = [
  'text',
  'dense_vector',
  'sparse_vector',
  'rank_feature',
  'rank_features',
  'search_as_you_type',
  'completion',
];

/**
 * The field capabilities Elasticsearch reports for a mapping when asked for the types above without
 * objects, nested fields and metadata fields.
 */
export const toFieldCaps = (properties: Properties, prefix = ''): FieldCapsResponse['fields'] =>
  Object.entries(properties).reduce<FieldCapsResponse['fields']>((fields, [key, property]) => {
    const name = `${prefix}${key}`;
    if (property.type === 'nested') {
      return fields;
    }
    if ('properties' in property && property.properties) {
      return { ...fields, ...toFieldCaps(property.properties, `${name}.`) };
    }

    const type = FIELD_CAPS_TYPES.get(property.type ?? '');
    const subFields =
      'fields' in property && property.fields ? toFieldCaps(property.fields, `${name}.`) : {};
    if (type === undefined) {
      return { ...fields, ...subFields };
    }

    return {
      ...fields,
      [name]: {
        [type]: {
          type,
          metadata_field: false,
          searchable: true,
          aggregatable: !NON_AGGREGATABLE_TYPES.includes(type),
          inference: property.type === 'semantic_text',
        },
      },
      ...subFields,
    };
  }, {});

export const EVENT_SOURCE_FIXTURES: readonly EventSourceFixture[] = [
  {
    id: 'ecs-clickstream',
    properties: {
      '@timestamp': { type: 'date' },
      message: { type: 'match_only_text' },
      event: { properties: { action: keyword, category: keyword, kind: keyword } },
      user: { properties: { id: keyword, segment: keyword } },
      session: { properties: { id: keyword } },
      url: { properties: { path: keyword, full: { type: 'wildcard' } } },
      http: { properties: { request: { properties: { referrer: keyword } } } },
      campaign: { properties: { source: keyword, medium: keyword, name: keyword } },
      device: { properties: { type: keyword } },
      user_agent: {
        properties: {
          name: keyword,
          original: dynamicString,
          os: { properties: { name: keyword } },
        },
      },
      geo: {
        properties: {
          country_iso_code: keyword,
          city_name: keyword,
          location: { type: 'geo_point' },
        },
      },
      product: {
        properties: { id: keyword, name: keyword, category: keyword, price: { type: 'float' } },
      },
      order: {
        properties: {
          id: keyword,
          total: { type: 'double' },
          quantity: { type: 'integer' },
          currency: keyword,
        },
      },
    },
    timeField: '@timestamp',
    fields: {
      action: { name: 'event.action', label: 'event action' },
      actors: [{ name: 'user.id', label: 'user', kind: 'user' }],
      session: { name: 'session.id', label: 'session' },
      measures: [
        { name: 'order.total', label: 'order total', kind: 'money' },
        { name: 'order.quantity', label: 'quantity', kind: 'generic' },
        { name: 'product.price', label: 'price', kind: 'money' },
      ],
      dimensions: [
        { name: 'campaign.name', label: 'campaign', kind: 'campaign' },
        { name: 'product.category', label: 'product category', kind: 'product' },
        { name: 'order.currency', label: 'currency', kind: 'currency' },
        { name: 'geo.country_iso_code', label: 'country', kind: 'geo' },
      ],
      geoPoint: 'geo.location',
    },
  },
  {
    // A flat table filled through dynamic mapping, as product analytics pipelines write it.
    id: 'product-analytics',
    properties: {
      timestamp: { type: 'date' },
      received_at: { type: 'date' },
      message_id: dynamicString,
      event: dynamicString,
      user_id: dynamicString,
      anonymous_id: dynamicString,
      session_id: { type: 'long' },
      platform: dynamicString,
      country: dynamicString,
      context_page_path: dynamicString,
      context_page_title: dynamicString,
      context_campaign_source: dynamicString,
      context_campaign_name: dynamicString,
      context_device_type: dynamicString,
      context_os_name: dynamicString,
      context_locale: dynamicString,
      properties: {
        properties: {
          plan: dynamicString,
          revenue: { type: 'float' },
          duration_ms: { type: 'long' },
          button_text: dynamicString,
        },
      },
    },
    timeField: 'timestamp',
    fields: {
      action: { name: 'event.keyword', label: 'event' },
      actors: [
        { name: 'user_id.keyword', label: 'user', kind: 'user' },
        { name: 'anonymous_id.keyword', label: 'anonymous', kind: 'user' },
      ],
      session: { name: 'session_id', label: 'session' },
      measures: [
        { name: 'properties.revenue', label: 'revenue', kind: 'money' },
        { name: 'properties.duration_ms', label: 'duration', kind: 'duration' },
      ],
      dimensions: [
        { name: 'context_campaign_name.keyword', label: 'campaign', kind: 'campaign' },
        { name: 'country.keyword', label: 'country', kind: 'geo' },
        { name: 'context_device_type.keyword', label: 'device type', kind: 'device' },
        { name: 'properties.plan.keyword', label: 'plan', kind: 'segment' },
      ],
    },
  },
  {
    id: 'game-telemetry',
    properties: {
      event_time: { type: 'date' },
      event_type: keyword,
      player_id: keyword,
      session_id: keyword,
      match_id: keyword,
      game_mode: keyword,
      map_name: keyword,
      character_class: keyword,
      level: { type: 'integer' },
      platform: keyword,
      country_code: keyword,
      client_version: keyword,
      item_sku: keyword,
      score: { type: 'integer' },
      xp_earned: { type: 'integer' },
      purchase_amount_usd: { type: 'scaled_float', scaling_factor: 100 },
      duration_ms: { type: 'long' },
      ping_ms: { type: 'integer' },
    },
    timeField: 'event_time',
    fields: {
      action: { name: 'event_type', label: 'event type' },
      actors: [{ name: 'player_id', label: 'player', kind: 'player' }],
      session: { name: 'session_id', label: 'session' },
      measures: [
        { name: 'purchase_amount_usd', label: 'amount', kind: 'money' },
        { name: 'duration_ms', label: 'duration', kind: 'duration' },
        { name: 'score', label: 'score', kind: 'generic' },
      ],
      dimensions: [
        { name: 'game_mode', label: 'game mode', kind: 'game' },
        { name: 'item_sku', label: 'sku', kind: 'product' },
        { name: 'country_code', label: 'country', kind: 'geo' },
        { name: 'platform', label: 'platform', kind: 'device' },
      ],
    },
  },
  {
    id: 'payments',
    properties: {
      created_at: { type: 'date' },
      transaction_id: keyword,
      type: keyword,
      status: keyword,
      decline_reason: keyword,
      amount: { type: 'scaled_float', scaling_factor: 100 },
      fee: { type: 'scaled_float', scaling_factor: 100 },
      currency: keyword,
      customer_id: keyword,
      merchant_id: keyword,
      merchant_category: keyword,
      payment_method: keyword,
      card_brand: keyword,
      card_country: keyword,
      ip_address: { type: 'ip' },
      risk_score: { type: 'float' },
      is_3ds: { type: 'boolean' },
      processing_time_ms: { type: 'integer' },
      description: { type: 'text' },
    },
    timeField: 'created_at',
    fields: {
      action: { name: 'type', label: 'type' },
      actors: [{ name: 'customer_id', label: 'customer', kind: 'customer' }],
      measures: [
        { name: 'amount', label: 'amount', kind: 'money' },
        { name: 'processing_time_ms', label: 'processing time', kind: 'duration' },
        { name: 'risk_score', label: 'score', kind: 'generic' },
      ],
      dimensions: [
        { name: 'status', label: 'status', kind: 'status' },
        { name: 'merchant_category', label: 'merchant category', kind: 'merchant' },
        { name: 'currency', label: 'currency', kind: 'currency' },
        { name: 'payment_method', label: 'payment method', kind: 'paymentMethod' },
      ],
    },
  },
  {
    id: 'crypto-transactions',
    properties: {
      block_time: { type: 'date' },
      block_number: { type: 'long' },
      tx_hash: keyword,
      tx_type: keyword,
      status: keyword,
      from_address: keyword,
      to_address: keyword,
      chain: keyword,
      token_symbol: keyword,
      value: { type: 'double' },
      value_usd: { type: 'double' },
      gas_used: { type: 'long' },
      gas_fee_native: { type: 'double' },
      nonce: { type: 'unsigned_long' },
    },
    timeField: 'block_time',
    fields: {
      action: { name: 'tx_type', label: 'tx type' },
      actors: [{ name: 'from_address', label: 'from address', kind: 'account' }],
      measures: [
        { name: 'value_usd', label: 'value', kind: 'money' },
        { name: 'gas_used', label: 'gas used', kind: 'generic' },
        { name: 'gas_fee_native', label: 'fee', kind: 'money' },
      ],
      dimensions: [
        { name: 'status', label: 'status', kind: 'status' },
        { name: 'token_symbol', label: 'token symbol', kind: 'asset' },
        { name: 'chain', label: 'chain', kind: 'asset' },
      ],
    },
  },
  {
    id: 'iot-sensors',
    properties: {
      '@timestamp': { type: 'date' },
      device_id: keyword,
      sensor_type: keyword,
      site: keyword,
      firmware_version: keyword,
      status: keyword,
      temperature_c: { type: 'float' },
      humidity_pct: { type: 'float' },
      pressure_hpa: { type: 'float' },
      battery_level: { type: 'integer' },
      rssi: { type: 'integer' },
      location: { type: 'geo_point' },
      metadata: { properties: { model: keyword, installed_on: { type: 'date' } } },
    },
    timeField: '@timestamp',
    fields: {
      actors: [{ name: 'device_id', label: 'device', kind: 'device' }],
      measures: [
        { name: 'temperature_c', label: 'temperature', kind: 'generic' },
        { name: 'humidity_pct', label: 'humidity', kind: 'generic' },
        { name: 'pressure_hpa', label: 'pressure', kind: 'generic' },
      ],
      dimensions: [
        { name: 'status', label: 'status', kind: 'status' },
        { name: 'site', label: 'site', kind: 'site' },
        { name: 'sensor_type', label: 'sensor type', kind: 'site' },
        { name: 'firmware_version', label: 'firmware version', kind: 'site' },
      ],
      geoPoint: 'location',
    },
  },
  {
    id: 'adtech',
    properties: {
      timestamp: { type: 'date' },
      event_type: keyword,
      auction_id: keyword,
      campaign_id: keyword,
      advertiser_id: keyword,
      publisher_id: keyword,
      placement_id: keyword,
      creative_id: keyword,
      exchange: keyword,
      ad_format: keyword,
      device_type: keyword,
      os: keyword,
      country: keyword,
      user_id: keyword,
      bid_price: { type: 'double' },
      win_price: { type: 'double' },
      latency_ms: { type: 'integer' },
      viewable: { type: 'boolean' },
    },
    timeField: 'timestamp',
    fields: {
      action: { name: 'event_type', label: 'event type' },
      actors: [{ name: 'user_id', label: 'user', kind: 'user' }],
      measures: [
        { name: 'win_price', label: 'win price', kind: 'money' },
        { name: 'latency_ms', label: 'latency', kind: 'duration' },
        { name: 'bid_price', label: 'bid price', kind: 'money' },
      ],
      dimensions: [
        { name: 'publisher_id', label: 'publisher', kind: 'ad' },
        { name: 'campaign_id', label: 'campaign', kind: 'campaign' },
        { name: 'country', label: 'country', kind: 'geo' },
        { name: 'device_type', label: 'device type', kind: 'device' },
      ],
    },
  },
  {
    id: 'multi-tenant',
    properties: {
      '@timestamp': { type: 'date' },
      tenant_id: keyword,
      user_id: { type: 'long' },
      event_name: keyword,
      feature: keyword,
      plan: keyword,
      region: keyword,
      api: { properties: { duration_ms: { type: 'integer' }, path: keyword } },
    },
    timeField: '@timestamp',
    fields: {
      action: { name: 'event_name', label: 'event' },
      actors: [{ name: 'user_id', label: 'user', kind: 'user' }],
      measures: [{ name: 'api.duration_ms', label: 'duration', kind: 'duration' }],
      dimensions: [
        { name: 'tenant_id', label: 'tenant', kind: 'tenant' },
        { name: 'region', label: 'region', kind: 'geo' },
        { name: 'plan', label: 'plan', kind: 'segment' },
      ],
    },
  },
  {
    // Names ES|QL cannot read bare.
    id: 'awkward-names',
    properties: {
      'event-time': { type: 'date' },
      'event-type': keyword,
      'user id': keyword,
      'session-id': keyword,
      'order amount (usd)': { type: 'double' },
      '1st_country': keyword,
      'payment status': keyword,
    },
    timeField: 'event-time',
    fields: {
      action: { name: 'event-type', label: 'event type' },
      actors: [{ name: 'user id', label: 'user', kind: 'user' }],
      session: { name: 'session-id', label: 'session' },
      measures: [{ name: 'order amount (usd)', label: 'order amount', kind: 'money' }],
      dimensions: [
        { name: 'payment status', label: 'status', kind: 'status' },
        { name: '1st_country', label: 'country', kind: 'geo' },
      ],
    },
  },
  {
    id: 'unrecognisable',
    properties: {
      created_at: { type: 'date' },
      title: { type: 'text' },
      body: { type: 'text' },
      tags: keyword,
      checksum: keyword,
      author: { properties: { display: keyword, bio: dynamicString } },
      revision: { type: 'integer' },
      views_total: { type: 'long' },
      published: { type: 'boolean' },
      comments: { type: 'nested', properties: { status: keyword, user_id: keyword } },
    },
    timeField: 'created_at',
    fields: undefined,
    dataKind: 'search',
  },
];

/** The source the cluster state reports for a fixture. */
export const toEventSource = ({
  id,
  timeField,
  fields,
  dataKind = 'events',
}: EventSourceFixture): AnalyticsEventSource => ({
  name: `poc-tmp-${id}`,
  kind: 'index',
  dataKind,
  documentsCount: 60,
  timeField,
  isSampleData: false,
  ...(fields && { fields }),
});
