/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { AnalyticsDataKind, AnalyticsEventSource } from '../analytics';

export interface DataKindFixture {
  id: string;
  kind: AnalyticsEventSource['kind'];
  properties: Record<string, MappingProperty>;
  timeField: string | null;
  dataKind: AnalyticsDataKind;
  /** The rule expected to decide. */
  rule: string;
}

const keyword: MappingProperty = { type: 'keyword' };
const text: MappingProperty = { type: 'text' };
const date: MappingProperty = { type: 'date' };
/** How dynamic mapping stores a string. */
const dynamicString: MappingProperty = {
  type: 'text',
  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
};

/** Mappings of search content and of event sources that resemble it. */
export const DATA_KIND_FIXTURES: readonly DataKindFixture[] = [
  {
    id: 'product-catalog',
    kind: 'index',
    properties: {
      sku: keyword,
      title: dynamicString,
      description: text,
      brand: keyword,
      category: keyword,
      price: { type: 'scaled_float', scaling_factor: 100 },
      currency: keyword,
      in_stock: { type: 'boolean' },
      stock_quantity: { type: 'integer' },
      rating: { type: 'float' },
      created_at: date,
      updated_at: date,
    },
    timeField: 'created_at',
    dataKind: 'search',
    rule: 'contentText',
  },
  {
    id: 'dynamic-catalog',
    kind: 'index',
    properties: {
      name: dynamicString,
      type: dynamicString,
      summary: dynamicString,
      vendor: dynamicString,
      price: { type: 'float' },
      published_at: date,
      updated_at: date,
    },
    timeField: null,
    dataKind: 'search',
    rule: 'noTimeField',
  },
  {
    id: 'knowledge-base',
    kind: 'index',
    properties: {
      title: text,
      body: { type: 'semantic_text' },
      url: keyword,
      product: keyword,
      version: keyword,
      '@timestamp': date,
      updated_at: date,
    },
    timeField: '@timestamp',
    dataKind: 'search',
    rule: 'searchIntentField',
  },
  {
    id: 'vector-index',
    kind: 'index',
    properties: {
      text,
      embedding: { type: 'dense_vector', dims: 384, index: true, similarity: 'cosine' },
      metadata: { properties: { source: keyword, page: { type: 'integer' } } },
    },
    timeField: null,
    dataKind: 'search',
    rule: 'searchIntentField',
  },
  {
    id: 'sparse-vector-index',
    kind: 'index',
    properties: {
      passage: text,
      ml: { properties: { tokens: { type: 'sparse_vector' } } },
      ingested_at: date,
    },
    timeField: null,
    dataKind: 'search',
    rule: 'searchIntentField',
  },
  {
    id: 'autocomplete',
    kind: 'index',
    properties: {
      suggest: { type: 'completion' },
      popularity: { type: 'rank_feature' },
      timestamp: date,
    },
    timeField: 'timestamp',
    dataKind: 'search',
    rule: 'searchIntentField',
  },
  {
    id: 'vector-data-stream',
    kind: 'dataStream',
    properties: {
      '@timestamp': date,
      message: { type: 'match_only_text' },
      message_embedding: { type: 'dense_vector', dims: 3 },
    },
    timeField: '@timestamp',
    dataKind: 'search',
    rule: 'searchIntentField',
  },
  {
    id: 'keywords-only',
    kind: 'index',
    properties: { code: keyword, label: keyword, parent: keyword, active: { type: 'boolean' } },
    timeField: null,
    dataKind: 'search',
    rule: 'noTimeField',
  },
  {
    id: 'books-tutorial',
    kind: 'index',
    properties: {
      name: dynamicString,
      author: dynamicString,
      release_date: date,
      page_count: { type: 'long' },
      language: dynamicString,
    },
    timeField: 'release_date',
    dataKind: 'search',
    rule: 'contentText',
  },
  {
    id: 'blog-posts-tutorial',
    kind: 'index',
    properties: {
      title: dynamicString,
      description: dynamicString,
      author: dynamicString,
      date: { type: 'date', format: 'yyyy-MM-dd' },
      category: dynamicString,
      tags: dynamicString,
      rating: { type: 'float' },
    },
    timeField: 'date',
    dataKind: 'search',
    rule: 'contentText',
  },
  {
    id: 'notes-with-owner',
    kind: 'index',
    properties: { title: text, body: text, user_id: keyword, created_at: date, updated_at: date },
    timeField: 'created_at',
    dataKind: 'search',
    rule: 'contentText',
  },
  {
    id: 'orders',
    kind: 'index',
    properties: {
      order_id: keyword,
      created_at: date,
      updated_at: date,
      customer_id: keyword,
      total_amount: { type: 'double' },
      currency: keyword,
      status: keyword,
      shipping_country: keyword,
      items: { properties: { product_name: dynamicString, quantity: { type: 'integer' } } },
      notes: text,
    },
    timeField: 'created_at',
    dataKind: 'events',
    rule: 'eventRoles',
  },
  {
    id: 'kibana-ecommerce',
    kind: 'index',
    properties: {
      order_date: date,
      order_id: keyword,
      customer_id: keyword,
      customer_full_name: dynamicString,
      customer_birth_date: date,
      category: dynamicString,
      manufacturer: dynamicString,
      currency: keyword,
      taxful_total_price: { type: 'half_float' },
      products: {
        properties: {
          product_name: dynamicString,
          created_on: date,
          price: { type: 'half_float' },
        },
      },
      geoip: { properties: { country_iso_code: keyword, location: { type: 'geo_point' } } },
    },
    timeField: 'order_date',
    dataKind: 'events',
    rule: 'eventRoles',
  },
  {
    id: 'kibana-flights',
    kind: 'index',
    properties: {
      timestamp: date,
      FlightNum: keyword,
      Carrier: keyword,
      OriginCountry: keyword,
      DestCountry: keyword,
      AvgTicketPrice: { type: 'float' },
      FlightDelayMin: { type: 'integer' },
      Cancelled: { type: 'boolean' },
      DestLocation: { type: 'geo_point' },
    },
    timeField: 'timestamp',
    dataKind: 'events',
    rule: 'eventTime',
  },
  {
    id: 'kibana-logs',
    kind: 'index',
    properties: {
      '@timestamp': date,
      timestamp: date,
      message: dynamicString,
      agent: dynamicString,
      clientip: { type: 'ip' },
      response: dynamicString,
      bytes: { type: 'long' },
      url: dynamicString,
      geo: { properties: { src: keyword, dest: keyword, coordinates: { type: 'geo_point' } } },
    },
    timeField: '@timestamp',
    dataKind: 'events',
    rule: 'eventTime',
  },
  {
    id: 'logs-data-stream',
    kind: 'dataStream',
    properties: {
      '@timestamp': date,
      message: { type: 'match_only_text' },
      log: { properties: { level: keyword } },
      host: { properties: { name: keyword } },
      service: { properties: { name: keyword } },
      data_stream: {
        properties: {
          type: { type: 'constant_keyword' },
          dataset: { type: 'constant_keyword' },
          namespace: { type: 'constant_keyword' },
        },
      },
    },
    timeField: '@timestamp',
    dataKind: 'events',
    rule: 'dataStream',
  },
  {
    id: 'audit-rows',
    kind: 'index',
    properties: { record_id: keyword, region: keyword, created_at: date, flagged: keyword },
    timeField: 'created_at',
    dataKind: 'events',
    rule: 'datedRows',
  },
];
