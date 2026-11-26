/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import { CRASH_FINGERPRINT_CASES } from '../../../../common/mobile/crash_fingerprint.test_helpers';

const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';

/** Applications of their own, so the other mobile fixtures' counts stay as they are. */
export const CRASH_APPS = {
  android: 'scout-crashes-android',
  ios: 'scout-crashes-ios',
  fingerprints: 'scout-crash-fingerprints',
  breakdowns: 'scout-crash-breakdowns',
} as const;

/** The device models of the breakdown group's crashes, one each; two more crashes have none. */
export const BREAKDOWN_DEVICE_MODELS = [
  'Model A',
  'Model B',
  'Model C',
  'Model D',
  'Model E',
  'Model F',
  'Model G',
] as const;

const at = (time: string) => `2021-01-18T${time}.000Z`;

const jvmTrace = (type: string, frame: string, line: number) =>
  [
    `${type}: crashed`,
    `\tat ${frame}(MainActivity.kt:${line})`,
    '\tat android.os.Looper.loop(Looper.java:294)',
  ].join('\n');

interface Crash {
  serviceName: string;
  osName: 'Android' | 'iOS';
  version: string;
  installationId: string;
  sessionId?: string;
  /** When the SDK sent it: EDOT iOS sends a crash on the next launch. */
  timestamp: string;
  /** When it happened, which EDOT iOS only sets here. */
  observedTimestamp?: string;
  /** EDOT iOS with legacy names sends `crash`. */
  eventName?: 'app.crash' | 'crash';
  type?: string;
  message?: string;
  stacktrace?: string;
  storedFingerprint?: string;
  /** Unset for a crash whose resource has no device model. */
  deviceModel?: string;
  osVersion: string;
}

const android = {
  serviceName: CRASH_APPS.android,
  osName: 'Android',
} as const;

/** The release the delayed iOS crash happened on, before the update that sent it. */
export const IOS_CRASHED_RELEASE = '8.4.0';

const ios = {
  serviceName: CRASH_APPS.ios,
  osName: 'iOS',
  version: '8.5.0',
  deviceModel: 'iPhone13,2',
  osVersion: '17.6.1',
  type: 'SIGSEGV',
  message: 'SEGV_MAPERR',
} as const;

const CRASHES: Crash[] = [
  // A device stuck in a crash loop on the older release: 4 events, 1 user.
  ...['05:00', '06:00', '07:00', '08:00'].map((time) => ({
    ...android,
    version: '4.1.0',
    installationId: 'crash-loop-device',
    sessionId: 'crash-loop-session',
    timestamp: at(`12:${time}`),
    type: 'java.lang.IllegalStateException',
    message: 'Fragment not attached to an activity.',
    stacktrace: jvmTrace('java.lang.IllegalStateException', 'com.example.Settings.onAttach', 42),
    deviceModel: 'SM-A145R',
    osVersion: '13',
  })),
  // A crash only the newest release has, on 3 devices, at different lines of the same frames.
  ...[
    { time: '20:00', line: 88, deviceModel: 'Pixel 8', osVersion: '15' },
    { time: '30:00', line: 91, deviceModel: 'Pixel 8', osVersion: '15' },
    { time: '40:00', line: 88, deviceModel: 'SM-S911B', osVersion: '14' },
  ].map(({ time, line, deviceModel, osVersion }, index) => ({
    ...android,
    version: '4.2.0',
    installationId: `crash-npe-device-${index + 1}`,
    sessionId: `crash-npe-session-${index + 1}`,
    timestamp: at(`12:${time}`),
    type: 'java.lang.NullPointerException',
    message: 'TrackRecorder is null',
    stacktrace: jvmTrace(
      'java.lang.NullPointerException',
      'com.example.MainActivity.onResume',
      line
    ),
    deviceModel,
    osVersion,
  })),
  // A crash both releases have: the older release's before the range but in the lookback, so it is
  // not new, even with the newest release picked.
  ...[
    { time: '11:30:00', version: '4.1.0' },
    { time: '12:45:00', version: '4.2.0' },
  ].map(({ time, version }) => ({
    ...android,
    version,
    installationId: 'crash-recurring-device',
    sessionId: `crash-recurring-session-${version}`,
    timestamp: at(time),
    type: 'java.lang.IllegalArgumentException',
    message: 'Invalid route id: null',
    stacktrace: jvmTrace('java.lang.IllegalArgumentException', 'com.example.RouteLoader.load', 17),
    deviceModel: 'Pixel 8',
    osVersion: '15',
  })),
  // The same iOS crash with different load addresses: sent on the next launch with the legacy
  // name, sent after the range ended, and without a session.
  {
    ...ios,
    installationId: 'crash-ios-device-1',
    sessionId: 'CRASH-IOS-SESSION-1',
    eventName: 'crash',
    timestamp: at('12:50:00'),
    observedTimestamp: at('12:15:00'),
    stacktrace: CRASH_FINGERPRINT_CASES.iosLaunchA.stacktrace,
  },
  // Crashed on the older release, and sent after the app was updated: its resource has the new
  // release, its report the one that crashed.
  {
    ...ios,
    installationId: 'crash-ios-device-2',
    sessionId: 'CRASH-IOS-SESSION-2',
    timestamp: at('13:20:00'),
    observedTimestamp: at('12:55:00'),
    stacktrace: CRASH_FINGERPRINT_CASES.iosLaunchB.stacktrace.replace(
      `Version:         ${ios.version} (850)`,
      `Version:         ${IOS_CRASHED_RELEASE} (840)`
    ),
  },
  {
    ...ios,
    installationId: 'crash-ios-device-2',
    timestamp: at('12:35:00'),
    observedTimestamp: at('12:35:00'),
    stacktrace: CRASH_FINGERPRINT_CASES.iosLaunchA.stacktrace,
  },
  // Sent in the range, but it happened before: not one of the range's crashes.
  {
    ...ios,
    installationId: 'crash-ios-device-3',
    sessionId: 'CRASH-IOS-SESSION-3',
    timestamp: at('12:10:00'),
    observedTimestamp: at('11:30:00'),
    stacktrace: CRASH_FINGERPRINT_CASES.iosLaunchB.stacktrace,
  },
  // More device models than a breakdown shows, and two crashes without one, which rank first and
  // take a row: "Other" must count both, and the top must still be five models.
  ...[...BREAKDOWN_DEVICE_MODELS, undefined, undefined].map((deviceModel, index) => ({
    serviceName: CRASH_APPS.breakdowns,
    osName: 'Android' as const,
    version: '1.0.0',
    installationId: `crash-breakdown-device-${index}`,
    timestamp: at(`12:${String(30 + index).padStart(2, '0')}:00`),
    type: 'java.lang.NullPointerException',
    message: 'crashed',
    stacktrace: jvmTrace('java.lang.NullPointerException', 'com.example.Breakdown.run', 1),
    deviceModel,
    osVersion: '15',
  })),
  // The fingerprint's golden cases, one device each.
  ...Object.entries(CRASH_FINGERPRINT_CASES).map(([name, crash], index) => ({
    serviceName: CRASH_APPS.fingerprints,
    osName: 'Android' as const,
    version: '1.0.0',
    installationId: `crash-case-${name}`,
    timestamp: at(`12:${String(10 + index).padStart(2, '0')}:00`),
    deviceModel: 'Pixel 8',
    osVersion: '15',
    ...crash,
  })),
];

/** The NPE's latest crash, whose session the detail lists before it. */
export const NPE_LATEST_SESSION = 'crash-npe-session-3';

const npeSession = {
  'service.name': CRASH_APPS.android,
  'service.version': '4.2.0',
  'os.name': 'Android',
};

/**
 * Events of the NPE's latest session and of another session of the app, and of the iOS session in
 * uppercase, as EDOT iOS writes its id, and in lowercase.
 */
const SESSION_EVENTS = [
  {
    index: TRACES_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:39:50'),
      name: 'elastic.app.screen.load',
      kind: 'Internal',
      trace_id: 'c'.repeat(32),
      span_id: 'c'.repeat(15) + '1',
      duration: 50_000_000,
      attributes: { 'session.id': NPE_LATEST_SESSION, 'app.screen.name': 'Map' },
    },
  },
  {
    index: TRACES_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:39:55'),
      name: 'POST',
      kind: 'Client',
      trace_id: 'c'.repeat(32),
      span_id: 'c'.repeat(15) + '2',
      duration: 420_000_000,
      attributes: {
        'session.id': NPE_LATEST_SESSION,
        'app.screen.name': 'Map',
        'http.request.method': 'POST',
        'url.full': 'https://api.example.com/tracks?id=7',
        'http.response.status_code': 503,
      },
    },
  },
  // The same request span sent again, as an SDK retrying an export does: listed once.
  {
    index: TRACES_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:39:55'),
      name: 'POST',
      kind: 'Client',
      trace_id: 'c'.repeat(32),
      span_id: 'c'.repeat(15) + '2',
      duration: 420_000_000,
      attributes: {
        'session.id': NPE_LATEST_SESSION,
        'app.screen.name': 'Map',
        'http.request.method': 'POST',
        'url.full': 'https://api.example.com/tracks?id=7',
        'http.response.status_code': 503,
      },
    },
  },
  // Another request, in another trace, whose span id happens to be the same: listed too.
  {
    index: TRACES_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:39:57'),
      name: 'GET',
      kind: 'Client',
      trace_id: 'f'.repeat(32),
      span_id: 'c'.repeat(15) + '2',
      duration: 80_000_000,
      attributes: {
        'session.id': NPE_LATEST_SESSION,
        'app.screen.name': 'Map',
        'http.request.method': 'GET',
        'url.full': 'https://api.example.com/tiles',
        'http.response.status_code': 200,
      },
    },
  },
  {
    index: LOGS_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:39:58'),
      event_name: 'app.widget.click',
      attributes: {
        'session.id': NPE_LATEST_SESSION,
        'app.screen.name': 'Map',
        'app.widget.name': 'Start recording',
      },
    },
  },
  // Another user's tap just before the crash, in the same app: never listed in this session.
  {
    index: LOGS_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:39:59'),
      event_name: 'app.widget.click',
      attributes: { 'session.id': 'crash-npe-session-2', 'app.widget.name': 'Another session' },
    },
  },
  // After the crash: never listed before it.
  {
    index: LOGS_INDEX,
    resource: npeSession,
    document: {
      '@timestamp': at('12:41:00'),
      event_name: 'app.widget.click',
      attributes: { 'session.id': NPE_LATEST_SESSION, 'app.widget.name': 'Retry' },
    },
  },
  {
    index: TRACES_INDEX,
    resource: { 'service.name': CRASH_APPS.ios, 'service.version': '8.5.0', 'os.name': 'iOS' },
    document: {
      '@timestamp': at('12:54:50'),
      name: 'Transfer - view appearing',
      kind: 'Client',
      scope: { name: 'UIViewController' },
      trace_id: 'd'.repeat(32),
      span_id: 'd'.repeat(16),
      duration: 57_000_000,
      attributes: { 'session.id': 'CRASH-IOS-SESSION-2' },
    },
  },
  // The same iOS session with its id in lowercase, as an SDK that doesn't uppercase it writes it.
  {
    index: TRACES_INDEX,
    resource: { 'service.name': CRASH_APPS.ios, 'service.version': '8.5.0', 'os.name': 'iOS' },
    document: {
      '@timestamp': at('12:54:40'),
      name: 'Accounts - view appearing',
      kind: 'Client',
      scope: { name: 'UIViewController' },
      trace_id: 'e'.repeat(32),
      span_id: 'e'.repeat(16),
      duration: 57_000_000,
      attributes: { 'session.id': 'crash-ios-session-2' },
    },
  },
];

const mobileResource = (attributes: Record<string, string>, osName: string) => ({
  'telemetry.distro.name': 'elastic',
  'telemetry.sdk.name': 'opentelemetry',
  'telemetry.sdk.language': osName === 'iOS' ? 'swift' : 'java',
  ...attributes,
});

const documents = [
  ...CRASHES.map((crash, index) => ({
    id: `dx-mobile-crash-${index}`,
    index: LOGS_INDEX,
    document: {
      '@timestamp': crash.timestamp,
      ...(crash.observedTimestamp ? { observed_timestamp: crash.observedTimestamp } : {}),
      event_name: crash.eventName ?? 'app.crash',
      resource: {
        attributes: mobileResource(
          {
            'service.name': crash.serviceName,
            'service.version': crash.version,
            'os.name': crash.osName,
            'os.version': crash.osVersion,
            ...(crash.deviceModel ? { 'device.model.identifier': crash.deviceModel } : {}),
            'app.installation.id': crash.installationId,
          },
          crash.osName
        ),
      },
      attributes: {
        ...(crash.sessionId ? { 'session.id': crash.sessionId } : {}),
        ...(crash.type ? { 'exception.type': crash.type } : {}),
        ...(crash.message ? { 'exception.message': crash.message } : {}),
        ...(crash.stacktrace ? { 'exception.stacktrace': crash.stacktrace } : {}),
        ...(crash.storedFingerprint ? { 'exception.fingerprint': crash.storedFingerprint } : {}),
      },
    },
  })),
  ...SESSION_EVENTS.map(({ index, resource, document }, position) => ({
    id: `dx-mobile-crash-session-${position}`,
    index,
    document: {
      ...document,
      resource: { attributes: mobileResource(resource, resource['os.name']) },
    },
  })),
];

/** Deletes the crash documents by their ids, leaving the rest of the data streams. */
export const deleteMobileCrashData = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: [LOGS_INDEX, TRACES_INDEX],
    query: { ids: { values: documents.map(({ id }) => id) } },
    refresh: true,
    ignore_unavailable: true,
  });
};

/** Indexes the crash documents, replacing what an interrupted run left behind. */
export const ingestMobileCrashData = async (esClient: EsClient): Promise<void> => {
  // Data streams only accept `create`, which would keep a leftover document's old body.
  await deleteMobileCrashData(esClient);
  const { errors, items } = await esClient.bulk({
    refresh: 'wait_for',
    operations: documents.flatMap(({ id, index, document }) => [
      { create: { _index: index, _id: id } },
      document,
    ]),
  });
  const failure = items.find((item) => item.create?.error);
  if (errors && failure) {
    throw new Error(`Could not ingest the mobile crash data: ${JSON.stringify(failure)}`);
  }
};
