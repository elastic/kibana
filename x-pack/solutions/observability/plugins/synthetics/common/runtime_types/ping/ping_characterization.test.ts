/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeCodecParity } from '../test_helpers/parity';
import { GetPingsParamsType, PingStateType, PingType, PingsResponseType } from './ping';
import { ErrorGroupsResponseType } from './error_groups';
import { ErrorStatsType } from './error_stats';
import {
  FullScreenshotType,
  JourneyStepType,
  RefResultType,
  ScreenshotBlockDocType,
  ScreenshotImageBlobType,
  ScreenshotRefImageDataType,
  SyntheticsJourneyApiResponseType,
} from './synthetics';
import * as zodPing from '../zod/ping';

const observer = {
  name: 'us-central',
  geo: {
    name: 'US Central',
    continent_name: 'North America',
    city_name: 'Iowa',
    country_iso_code: 'US',
    location: { lat: 41.25, lon: -95.86 },
  },
  hostname: 'agent-1',
  ip: ['1.2.3.4'],
  mac: ['aa:bb:cc:dd:ee:ff'],
};

const errorState = {
  duration_ms: 1200,
  checks: 3,
  ends: {
    duration_ms: '400',
    checks: 1,
    ends: null,
    started_at: '2024-01-01T00:00:00.000Z',
    id: 'end-1',
    up: 0,
    down: 1,
    status: 'down',
  },
  started_at: '2024-01-01T00:00:00.000Z',
  id: 'state-1',
  up: 0,
  down: 1,
  status: 'down',
};

const monitor = {
  name: 'Homepage',
  id: 'mon-1',
  status: 'up',
  type: 'http',
  check_group: 'cg-1',
  timespan: { gte: '2024-01-01T00:00:00.000Z', lt: '2024-01-01T00:05:00.000Z' },
  duration: { us: 120000 },
  ip: '1.2.3.4',
  fleet_managed: true,
  project: { id: 'proj', name: 'web' },
  origin: 'ui' as const,
};

const fullPing = {
  monitor,
  docId: 'doc-1',
  observer,
  '@timestamp': '2024-01-01T00:00:00.000Z',
  agent: {
    ephemeral_id: 'eph',
    id: 'agent-1',
    type: 'heartbeat',
    version: '8.0.0',
    name: 'agent',
    hostname: 'host-1',
  },
  container: { id: 'c1', image: { name: 'img', tag: 'latest' }, name: 'web', runtime: 'docker' },
  ecs: { version: '8.0.0' },
  error: { message: 'timeout', code: 'TIMEOUT', id: 'err-1', stack_trace: null, type: 'io' },
  http: {
    request: {
      body: { bytes: 12, content: { text: '{}' } },
      bytes: 12,
      method: 'GET',
      referrer: 'https://elastic.co',
    },
    response: {
      body: { bytes: 100, content: 'ok', content_bytes: 100, hash: 'h' },
      bytes: 100,
      redirects: ['https://elastic.co/redirect'],
      status_code: 200,
      headers: { 'content-type': 'text/html', 'set-cookie': ['a', 'b'] },
    },
    version: '1.1',
  },
  icmp: { requests: 1, rtt: { us: 20 } },
  kubernetes: { pod: { name: 'pod', uid: 'uid' } },
  resolve: { ip: '1.2.3.4', rtt: { us: 5 } },
  summary: {
    down: 0,
    up: 1,
    status: 'up' as const,
    attempt: 1,
    max_attempts: 2,
    final_attempt: true,
    retry_group: 'rg',
  },
  synthetics: {
    index: 0,
    journey: { id: 'j1', name: 'home' },
    error: { message: 'click failed', name: 'Error', stack: 'stack' },
    package_version: '1.0.0',
    step: { status: 'succeeded', index: 0, name: 'load', duration: { us: 10 } },
    type: 'step/end',
    blob: 'img',
    blob_mime: 'image/jpeg',
    payload: {
      duration: 10,
      index: 0,
      is_navigation_request: true,
      message: 'ok',
      method: 'GET',
      name: 'load',
      params: { homepage: 'https://elastic.co' },
      source: 'inline',
      start: 0,
      status: '200',
      ts: 1,
      type: 'step/end',
      url: 'https://elastic.co',
      end: 10,
      text: 'Welcome',
    },
    isFullScreenshot: true,
    isScreenshotRef: false,
  },
  tags: ['prod'],
  tcp: { rtt: { connect: { us: 15 } } },
  tls: {
    cipher: 'TLS_AES_128_GCM_SHA256',
    established: true,
    server: {
      hash: { sha256: 'abc', sha1: 'def' },
      x509: {
        issuer: { common_name: 'CA', distinguished_name: 'CN=CA' },
        subject: { common_name: 'www.elastic.co', distinguished_name: 'CN=www.elastic.co' },
        serial_number: '1',
        public_key_algorithm: 'RSA',
        signature_algorithm: 'SHA256',
        not_after: '2026-01-01T00:00:00.000Z',
        not_before: '2023-01-01T00:00:00.000Z',
        public_key_curve: 'P-256',
        public_key_exponent: 65537,
        public_key_size: 2048,
      },
    },
  },
  url: {
    domain: 'elastic.co',
    full: 'https://www.elastic.co',
    port: 443,
    scheme: 'https',
    path: '/',
  },
  service: { name: 'web' },
  config_id: 'cfg-1',
  state: errorState,
  data_stream: { namespace: 'default', type: 'synthetics', dataset: 'http' },
  labels: { env: 'prod' },
  remote: { remoteName: 'ccs-1', kibanaUrl: 'https://remote' },
  kibanaUrl: 'https://kibana',
};

const journeyStep = {
  _id: 'step-1',
  '@timestamp': '2024-01-01T00:00:00.000Z',
  config_id: 'cfg-1',
  monitor: {
    id: 'mon-1',
    check_group: 'cg-1',
    duration: { us: 10 },
    name: 'Homepage',
    status: 'up',
    type: 'browser',
    timespan: { gte: '2024-01-01T00:00:00.000Z', lt: '2024-01-01T00:05:00.000Z' },
  },
  observer,
  synthetics: {
    type: 'step/end',
    index: 0,
    journey: { id: 'j1', name: 'home' },
    step: { status: 'succeeded', index: 0, name: 'load', duration: { us: 10 } },
  },
  error: { message: 'click failed' },
};

const refResult = {
  '@timestamp': '123',
  monitor: { check_group: 'check-group' },
  screenshot_ref: {
    width: 1200,
    height: 900,
    blocks: [{ hash: 'hash1', top: 0, left: 0, height: 120, width: 90 }],
  },
  synthetics: {
    package_version: 'v1',
    step: { name: 'step name', index: 0 },
    type: 'step/screenshot_ref' as const,
  },
};

describeCodecParity({
  label: 'PingType',
  ioTs: PingType,
  zod: zodPing.PingType,
  valid: [
    fullPing,
    { monitor, docId: 'doc-1', observer, '@timestamp': '2024-01-01T00:00:00.000Z' },
  ],
  invalid: [
    { docId: 'doc-1', observer, '@timestamp': '2024-01-01T00:00:00.000Z' },
    { ...fullPing, monitor: { ...monitor, origin: 'cli' } },
    { ...fullPing, observer: { name: 'x' } },
  ],
});

describeCodecParity({
  label: 'PingStateType',
  ioTs: PingStateType,
  zod: zodPing.PingStateType,
  valid: [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      '@timestamp': '2024-01-01T00:00:00.000Z',
      monitor,
      docId: 'doc-1',
      state: errorState,
      error: { message: 'down' },
      config_id: 'cfg-1',
      observer,
      http: { response: { status_code: 500 } },
    },
  ],
  invalid: [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      '@timestamp': '2024-01-01T00:00:00.000Z',
      monitor,
      docId: 'doc-1',
      state: errorState,
      error: { message: 'down' },
      observer,
    },
  ],
});

describeCodecParity({
  label: 'PingsResponseType',
  ioTs: PingsResponseType,
  zod: zodPing.PingsResponseType,
  valid: [{ total: 1, pings: [fullPing] }],
  invalid: [{ total: 1 }, { total: '1', pings: [] }],
});

describeCodecParity({
  label: 'GetPingsParamsType',
  ioTs: GetPingsParamsType,
  zod: zodPing.GetPingsParamsType,
  valid: [
    { dateRange: { from: 'now-15m', to: 'now' } },
    {
      dateRange: { from: 'now-15m', to: 'now' },
      excludedLocations: 'private',
      index: 0,
      size: 50,
      pageIndex: 1,
      locations: 'us_central',
      monitorId: 'mon-1',
      sort: 'desc',
      status: 'up',
      remoteName: 'ccs-1',
    },
  ],
  invalid: [{}, { dateRange: { from: 'now-15m' } }],
});

describeCodecParity({
  label: 'JourneyStepType',
  ioTs: JourneyStepType,
  zod: zodPing.JourneyStepType,
  valid: [journeyStep],
  invalid: [
    { ...journeyStep, _id: 1 },
    { '@timestamp': 'x', monitor: { id: 'm', check_group: 'c' }, synthetics: { type: 'step/end' } },
  ],
});

describeCodecParity({
  label: 'FullScreenshotType',
  ioTs: FullScreenshotType,
  zod: zodPing.FullScreenshotType,
  valid: [
    {
      synthetics: {
        blob: 'image data',
        blob_mime: 'image/jpeg',
        step: { name: 'step name' },
        type: 'step/screenshot',
      },
    },
  ],
  invalid: [{ synthetics: { step: { name: 'x' }, type: 'step/screenshot_ref' } }],
});

describeCodecParity({
  label: 'RefResultType',
  ioTs: RefResultType,
  zod: zodPing.RefResultType,
  valid: [refResult],
  invalid: [{ ...refResult, synthetics: { ...refResult.synthetics, type: 'step/screenshot' } }],
});

describeCodecParity({
  label: 'ScreenshotImageBlobType',
  ioTs: ScreenshotImageBlobType,
  zod: zodPing.ScreenshotImageBlobType,
  valid: [{ stepName: null, maxSteps: 1, src: 'image data' }],
  invalid: [{ stepName: null, src: 'image data' }],
});

describeCodecParity({
  label: 'ScreenshotBlockDocType',
  ioTs: ScreenshotBlockDocType,
  zod: zodPing.ScreenshotBlockDocType,
  valid: [{ id: 'h1', synthetics: { blob: 'x', blob_mime: 'image/jpeg' } }],
  invalid: [{ id: 'h1', synthetics: { blob: 'x' } }],
});

describeCodecParity({
  label: 'ScreenshotRefImageDataType',
  ioTs: ScreenshotRefImageDataType,
  zod: zodPing.ScreenshotRefImageDataType,
  valid: [{ stepName: null, maxSteps: 1, ref: { screenshotRef: refResult } }],
  invalid: [{ stepName: null, maxSteps: 1, ref: {} }],
});

describeCodecParity({
  label: 'SyntheticsJourneyApiResponseType',
  ioTs: SyntheticsJourneyApiResponseType,
  zod: zodPing.SyntheticsJourneyApiResponseType,
  valid: [
    { checkGroup: 'cg-1', steps: [journeyStep] },
    {
      checkGroup: 'cg-1',
      steps: [journeyStep],
      details: {
        timestamp: '2024-01-01T00:00:00.000Z',
        journey: journeyStep,
        next: { timestamp: '2024-01-01T00:05:00.000Z', checkGroup: 'cg-2' },
        previous: { timestamp: '2024-01-01T00:00:00.000Z', checkGroup: 'cg-0' },
        summary: { state: errorState },
      },
    },
    { checkGroup: 'cg-1', steps: [journeyStep], details: null },
  ],
  invalid: [{ steps: [journeyStep] }],
});

describeCodecParity({
  label: 'ErrorGroupsResponseType',
  ioTs: ErrorGroupsResponseType,
  zod: zodPing.ErrorGroupsResponseType,
  valid: [
    {
      groups: [
        {
          name: 'timeout',
          sampleMessage: 'timed out',
          pattern: 'persistent',
          count: 4,
          monitorCount: 2,
          locationCount: 1,
          firstSeen: '2024-01-01T00:00:00.000Z',
          lastSeen: '2024-01-02T00:00:00.000Z',
          histogram: [{ timestamp: 1, count: 2 }],
          items: [
            {
              timestamp: '2024-01-01T00:00:00.000Z',
              monitorName: 'Homepage',
              monitorType: 'http',
              configId: 'cfg-1',
              stateId: 's1',
              checkGroup: 'cg-1',
              locationName: 'US Central',
              locationId: 'us_central',
              durationMs: 1000,
              errorMessage: 'timed out',
            },
          ],
        },
      ],
    },
  ],
  invalid: [{ groups: [{ name: 'timeout', pattern: 'always' }] }],
});

describeCodecParity({
  label: 'ErrorStatsType',
  ioTs: ErrorStatsType,
  zod: zodPing.ErrorStatsType,
  valid: [
    {
      totalChecks: 100,
      downChecks: 10,
      errorRate: 0.1,
      affectedMonitors: 2,
      totalMonitors: 8,
      errorCount: 10,
      avgDurationMs: 200,
      previousErrorRate: 0.05,
      errorRateDelta: 0.05,
      locationStats: [{ location: 'us_central', count: 4 }],
      topFailingMonitors: [
        {
          configId: 'cfg-1',
          monitorName: 'Homepage',
          downChecks: 4,
          totalChecks: 10,
          errorRate: 0.4,
          downtimeMs: 4000,
        },
      ],
      insights: {
        failingDomains: [{ domain: 'elastic.co', count: 2 }],
        tagStats: [{ tag: 'prod', downChecks: 4, totalChecks: 10, errorRate: 0.4 }],
        statusCodes: [{ statusCode: 500, count: 3 }],
        monitorTypeStats: [{ monitorType: 'http', downChecks: 4, totalChecks: 10, errorRate: 0.4 }],
        emergingTerms: [{ term: 'timeout', score: 1.2, foregroundCount: 4, backgroundCount: 1 }],
      },
    },
  ],
  invalid: [{ totalChecks: 100, downChecks: 10 }],
});
