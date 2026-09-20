/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpMonitorFixture } from '../../../test/scout/common/fixtures/data/http_monitor';
import { browserMonitorFixture } from '../../../test/scout/common/fixtures/data/browser_monitor';
import { inspectBrowserMonitorFixture } from '../../../test/scout/monitor_crud/api/fixtures/data/browser_monitor_fixture';
import { tcpMonitorFixture } from '../../../test/scout/monitor_crud/api/fixtures/data/tcp_monitor';
import { icmpMonitorFixture } from '../../../test/scout/monitor_crud/api/fixtures/data/icmp_monitor';
import {
  fullBrowserMonitor,
  fullHttpMonitor,
  fullIcmpMonitor,
  fullTcpMonitor,
} from '../../../common/runtime_types/test_helpers/monitor_fixtures';
import { MAX_ROUTE_STRING_LENGTH } from '../zod_query';
import { createMonitorRequestBody, editMonitorRequestBody } from './monitor_request_body';

const scoutHttpCreate = {
  type: 'http',
  url: 'https://www.elastic.co',
  locations: ['us_central'],
};

describe('createMonitorRequestBody', () => {
  it('accepts the Scout public-API HTTP create payload (type, url, locations; no name)', () => {
    expect(createMonitorRequestBody.parse(scoutHttpCreate)).toEqual(scoutHttpCreate);
  });

  it('accepts private_locations and a numeric schedule', () => {
    const payload = {
      type: 'http',
      url: 'https://www.google.com',
      private_locations: ['pl-1'],
      schedule: 5,
      retest_on_failure: true,
    };
    expect(createMonitorRequestBody.parse(payload)).toEqual(payload);
  });

  it('accepts UI location objects and a {number,unit} schedule', () => {
    const payload = {
      type: 'http',
      urls: 'https://example.com',
      locations: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
      schedule: { number: '5', unit: 'm' },
    };
    expect(createMonitorRequestBody.parse(payload)).toEqual(payload);
  });

  it.each([
    ['http', httpMonitorFixture],
    ['tcp', tcpMonitorFixture],
    ['icmp', icmpMonitorFixture],
    ['browser', browserMonitorFixture],
    ['inspect-browser', inspectBrowserMonitorFixture],
    ['full-http', fullHttpMonitor()],
    ['full-tcp', fullTcpMonitor()],
    ['full-icmp', fullIcmpMonitor()],
    ['full-browser', fullBrowserMonitor()],
  ])('accepts the %s pre-validation fixture', (_name, fixture) => {
    const result = createMonitorRequestBody.safeParse(fixture);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it('accepts nested ssl/check/source aliases used by the public API', () => {
    const payload = {
      type: 'browser',
      inline_script: 'step("Visit", async () => {})',
      locations: ['us_central'],
      ssl: { verification_mode: 'full' },
      source: { inline: { script: 'step("Visit", async () => {})' } },
      service: { name: 'my-service' },
    };
    expect(createMonitorRequestBody.safeParse(payload).success).toBe(true);
  });

  it('rejects a missing type', () => {
    expect(createMonitorRequestBody.safeParse({ url: 'https://example.com' }).success).toBe(false);
  });

  it('rejects an unknown monitor type', () => {
    expect(
      createMonitorRequestBody.safeParse({ ...scoutHttpCreate, type: 'not-a-monitor-type' }).success
    ).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(
      createMonitorRequestBody.safeParse({ ...scoutHttpCreate, not_a_real_monitor_key: true })
        .success
    ).toBe(false);
  });

  it('rejects the camelCase privateLocations typo', () => {
    expect(
      createMonitorRequestBody.safeParse({
        ...scoutHttpCreate,
        privateLocations: ['moon'],
      }).success
    ).toBe(false);
  });

  it('rejects an invalid namespace', () => {
    expect(
      createMonitorRequestBody.safeParse({
        ...scoutHttpCreate,
        namespace: 'Invalid Namespace',
      }).success
    ).toBe(false);
  });

  it('accepts an empty locations array (combined with private_locations in-handler)', () => {
    expect(
      createMonitorRequestBody.safeParse({
        type: 'http',
        locations: [],
        private_locations: ['pl-1'],
      }).success
    ).toBe(true);
  });

  it('rejects a non-object body', () => {
    expect(createMonitorRequestBody.safeParse([]).success).toBe(false);
    expect(createMonitorRequestBody.safeParse('http').success).toBe(false);
    expect(createMonitorRequestBody.safeParse(null).success).toBe(false);
  });

  it('rejects an over-long string field', () => {
    expect(
      createMonitorRequestBody.safeParse({
        ...scoutHttpCreate,
        url: 'x'.repeat(MAX_ROUTE_STRING_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('accepts per-type public-API aliases', () => {
    expect(
      createMonitorRequestBody.safeParse({
        type: 'tcp',
        host: 'example.com:443',
        locations: ['us'],
      }).success
    ).toBe(true);
    expect(
      createMonitorRequestBody.safeParse({ type: 'icmp', host: '8.8.8.8', locations: ['us'] })
        .success
    ).toBe(true);
    expect(
      createMonitorRequestBody.safeParse({
        type: 'browser',
        inline_script: 'step("Visit", async () => {})',
        locations: ['us'],
      }).success
    ).toBe(true);
    expect(
      createMonitorRequestBody.safeParse({
        type: 'api',
        inline_script: 'step("Visit", async () => {})',
        private_locations: ['pl-1'],
      }).success
    ).toBe(true);
  });

  it.each([
    ['http', { hosts: 'example.com:443' }],
    ['http', { host: 'example.com:443' }],
    ['http', { wait: '1' }],
    ['http', { inline_script: 'step("x", async () => {})' }],
    ['tcp', { url: 'https://example.com' }],
    ['tcp', { inline_script: 'step("x", async () => {})' }],
    ['tcp', { wait: '1' }],
    ['icmp', { url: 'https://example.com' }],
    ['icmp', { 'ssl.verification_mode': 'full' }],
    ['browser', { url: 'https://example.com' }],
    ['browser', { host: 'example.com:443' }],
    ['api', { url: 'https://example.com' }],
    ['api', { throttling: { id: 'default', label: 'Default', value: null } }],
  ])('rejects %s fields that belong to another monitor type', (type, extra) => {
    expect(createMonitorRequestBody.safeParse({ type, locations: ['us'], ...extra }).success).toBe(
      false
    );
  });
});

describe('editMonitorRequestBody', () => {
  it('accepts a partial patch without type or name', () => {
    expect(editMonitorRequestBody.parse({ enabled: false })).toEqual({ enabled: false });
  });

  it('accepts an empty object so the handler can 400 with its own copy', () => {
    expect(editMonitorRequestBody.parse({})).toEqual({});
  });

  it('rejects an unknown top-level field', () => {
    expect(editMonitorRequestBody.safeParse({ not_a_real_monitor_key: true }).success).toBe(false);
  });

  it('rejects an unknown monitor type when type is present', () => {
    expect(editMonitorRequestBody.safeParse({ type: 'not-a-monitor-type' }).success).toBe(false);
  });

  it('rejects cross-type fields when type is present', () => {
    expect(editMonitorRequestBody.safeParse({ type: 'http', hosts: 'example.com' }).success).toBe(
      false
    );
  });

  it('accepts a typed HTTP patch', () => {
    expect(editMonitorRequestBody.parse({ type: 'http', url: 'https://example.com' })).toEqual({
      type: 'http',
      url: 'https://example.com',
    });
  });
});
