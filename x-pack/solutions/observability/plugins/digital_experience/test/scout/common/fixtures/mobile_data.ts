/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';

const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';

/** Inside `TIME_RANGE`. */
const TIMESTAMP = '2021-01-18T12:30:00.000Z';
/** Inside `TIME_RANGE`, before and after `TIMESTAMP`, for releases that show up apart. */
const EARLIER_TIMESTAMP = '2021-01-18T12:10:00.000Z';
const LATER_TIMESTAMP = '2021-01-18T12:45:00.000Z';

/**
 * The edges of `TIME_RANGE` (12:00 to 13:00) and of the hour before it, the previous period. Both
 * periods include their start and exclude their end.
 */
export const BOUNDARY_TIMESTAMPS = {
  previousStart: '2021-01-18T11:00:00.000Z',
  previousLast: '2021-01-18T11:59:59.999Z',
  start: '2021-01-18T12:00:00.000Z',
  end: '2021-01-18T13:00:00.000Z',
} as const;

/**
 * Mobile applications as EDOT Android and iOS send them, in miniature: the Elastic distribution
 * (`telemetry.distro.name: elastic`) on a mobile `os.name`, with the upstream `telemetry.sdk.*`.
 * A React Native app on Android, iOS and iPadOS, an Android app, an Android app on an SDK that
 * still sends `telemetry.sdk.name: android` without the distribution, an Android app with sessions
 * on the edges of the periods, an Android app without numeric releases, an iOS app on two-part
 * releases, and two services that must never show up as mobile: a backend Java service, and EDOT
 * Browser on an iPhone, which is the Elastic distribution on `os.name: iOS` too.
 */
export const MOBILE_APPS = {
  reactNative: 'scout-shop-mobile',
  android: 'scout-trailmap-android',
  legacyAndroid: 'scout-legacy-android',
  boundaryAndroid: 'scout-boundary-android',
  nightlyAndroid: 'scout-nightly-android',
  shortVersionIos: 'scout-short-version-ios',
  backendJava: 'scout-backend-java',
  browserOnIphone: 'scout-browser-on-iphone',
} as const;

interface MobileDocument {
  serviceName: string;
  distroName?: string;
  /** The upstream `opentelemetry` unless set. */
  sdkName?: string;
  sdkLanguage: string;
  osName?: string;
  version: string;
  /** Android `versionCode` and iOS `CFBundleVersion`, apart from the release as the SDKs send it. */
  buildId?: string;
  installationId?: string;
  sessionId: string;
  exception?: boolean;
  /** A span in the traces index; a log event otherwise. */
  isSpan?: boolean;
  /** `TIMESTAMP` unless set. */
  timestamp?: string;
}

const EDOT_MOBILE = { distroName: 'elastic', version: '1.0.0' };

const MOBILE_DOCUMENTS: MobileDocument[] = [
  // React Native, Android: `versionName` as the release, `versionCode` as the build.
  ...['rn-a-1', 'rn-a-2'].map((sessionId, index) => ({
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.reactNative,
    sdkLanguage: 'java',
    osName: 'Android',
    buildId: '10',
    installationId: 'installation-rn-android',
    sessionId,
    exception: index === 0,
  })),
  // A span of a session that has a log event too: still one session.
  {
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.reactNative,
    sdkLanguage: 'java',
    osName: 'Android',
    buildId: '10',
    installationId: 'installation-rn-android',
    sessionId: 'rn-a-2',
    isSpan: true,
  },
  // React Native on an iPhone and an iPad: the same release, the iOS platform both. The iPad
  // session only has a span.
  {
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.reactNative,
    sdkLanguage: 'swift',
    osName: 'iOS',
    buildId: '5',
    installationId: 'installation-rn-iphone',
    sessionId: 'RN-I-1',
  },
  {
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.reactNative,
    sdkLanguage: 'swift',
    osName: 'iPadOS',
    buildId: '5',
    installationId: 'installation-rn-ipad',
    sessionId: 'RN-I-2',
    isSpan: true,
  },
  // Most sessions still on 2.9.0, the newest release 2.10.0, which only a version sort puts last.
  // Later in the same session, versions that aren't releases: the `version` type would sort each
  // after 2.10.0, and each showed up after it.
  ...[
    { version: '2.9.0', sessionId: 'android-1' },
    { version: '2.9.0', sessionId: 'android-2' },
    { version: '2.10.0', sessionId: 'android-3' },
    ...['debug', '', 'v3.0.0', '3.0.0-beta', '3.0.0+45', '2.010.0'].map((version) => ({
      version,
      sessionId: 'android-3',
      timestamp: LATER_TIMESTAMP,
    })),
  ].map(({ sessionId, ...doc }) => ({
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.android,
    sdkLanguage: 'java',
    osName: 'Android',
    installationId: `installation-${sessionId}`,
    sessionId,
    ...doc,
  })),
  {
    serviceName: MOBILE_APPS.legacyAndroid,
    sdkName: 'android',
    sdkLanguage: 'java',
    version: '0.9.0',
    installationId: 'installation-legacy-android',
    sessionId: 'legacy-1',
  },
  // One session per edge: the previous period's start and last millisecond, the time range's start
  // and its end, which neither period includes.
  ...Object.entries(BOUNDARY_TIMESTAMPS).map(([edge, timestamp]) => ({
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.boundaryAndroid,
    sdkLanguage: 'java',
    osName: 'Android',
    installationId: 'installation-boundary',
    sessionId: `boundary-${edge}`,
    timestamp,
  })),
  // Only releases that aren't numeric: `build-b` first, then `build-a`, which text order puts first.
  ...[
    { version: 'build-b', timestamp: EARLIER_TIMESTAMP },
    { version: 'build-a', timestamp: TIMESTAMP },
  ].map(({ version, timestamp }) => ({
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.nightlyAndroid,
    sdkLanguage: 'java',
    osName: 'Android',
    version,
    installationId: 'installation-nightly',
    sessionId: 'nightly-1',
    timestamp,
  })),
  // iOS short versions have two parts: 1.10 first, then 1.9, which text order puts last too.
  ...[
    { version: '1.10', timestamp: EARLIER_TIMESTAMP },
    { version: '1.9', timestamp: LATER_TIMESTAMP },
  ].map(({ version, timestamp }) => ({
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.shortVersionIos,
    sdkLanguage: 'swift',
    osName: 'iOS',
    version,
    installationId: 'installation-short-version',
    sessionId: 'SHORT-1',
    timestamp,
  })),
  {
    serviceName: MOBILE_APPS.backendJava,
    sdkLanguage: 'java',
    osName: 'Linux',
    version: '9.9.9',
    sessionId: 'backend-1',
  },
  {
    serviceName: MOBILE_APPS.browserOnIphone,
    distroName: 'elastic',
    sdkLanguage: 'webjs',
    osName: 'iOS',
    version: '3.0.0',
    sessionId: 'browser-1',
  },
];

const toSpanFields = (index: number) => {
  const id = index.toString(16);
  return {
    trace_id: id.padStart(32, '0'),
    span_id: id.padStart(16, '0'),
    kind: 'Internal',
    name: 'ActivityResumed',
    duration: 1000000,
  };
};

const documents = MOBILE_DOCUMENTS.map((doc, index) => ({
  id: `dx-mobile-${index}`,
  index: doc.isSpan ? TRACES_INDEX : LOGS_INDEX,
  document: {
    '@timestamp': doc.timestamp ?? TIMESTAMP,
    // Events the EDOT mobile SDKs send: an app lifecycle change, or an exception.
    ...(doc.isSpan
      ? toSpanFields(index)
      : { event_name: doc.exception ? 'exception' : 'device.app.lifecycle' }),
    resource: {
      attributes: {
        'service.name': doc.serviceName,
        'service.version': doc.version,
        ...(doc.buildId ? { 'app.build_id': doc.buildId } : {}),
        ...(doc.distroName ? { 'telemetry.distro.name': doc.distroName } : {}),
        'telemetry.sdk.name': doc.sdkName ?? 'opentelemetry',
        'telemetry.sdk.language': doc.sdkLanguage,
        ...(doc.osName ? { 'os.name': doc.osName } : {}),
        ...(doc.installationId ? { 'app.installation.id': doc.installationId } : {}),
      },
    },
    attributes: {
      'session.id': doc.sessionId,
      ...(doc.exception ? { 'exception.type': 'java.lang.IllegalStateException' } : {}),
    },
  },
}));

/** What the applications route should answer for each mobile application, all its platforms. */
export const EXPECTED_MOBILE_ROWS = [
  {
    // One application on Android, iOS and iPadOS, which counts as iOS.
    serviceName: MOBILE_APPS.reactNative,
    platforms: ['android', 'ios'],
    latestRelease: '1.0.0',
    sessions: { count: 4 },
    users: { count: 3 },
    errorRate: 0.25,
  },
  {
    // The newest release, not the one with the most sessions, nor a later non-release.
    serviceName: MOBILE_APPS.android,
    platforms: ['android'],
    latestRelease: '2.10.0',
    sessions: { count: 3 },
    users: { count: 3 },
    errorRate: 0,
  },
  {
    // Android from its SDK name alone: no distribution, no `os.name`.
    serviceName: MOBILE_APPS.legacyAndroid,
    platforms: ['android'],
    latestRelease: '0.9.0',
    sessions: { count: 1 },
    users: { count: 1 },
    errorRate: 0,
  },
  {
    // Only the session on the time range's start: its end is excluded.
    serviceName: MOBILE_APPS.boundaryAndroid,
    platforms: ['android'],
    latestRelease: '1.0.0',
    sessions: { count: 1 },
    users: { count: 1 },
    errorRate: 0,
  },
  {
    // No numeric release: the one that first showed up last.
    serviceName: MOBILE_APPS.nightlyAndroid,
    platforms: ['android'],
    latestRelease: 'build-a',
    sessions: { count: 1 },
    users: { count: 1 },
    errorRate: 0,
  },
  {
    // Two-part releases compared as versions, not by text nor by when they showed up.
    serviceName: MOBILE_APPS.shortVersionIos,
    platforms: ['ios'],
    latestRelease: '1.10',
    sessions: { count: 1 },
    users: { count: 1 },
    errorRate: 0,
  },
] as const;

/** Deletes the mobile documents by their ids, leaving the rest of the data streams. */
export const deleteMobileData = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: [LOGS_INDEX, TRACES_INDEX],
    query: { ids: { values: documents.map(({ id }) => id) } },
    refresh: true,
    ignore_unavailable: true,
  });
};

/** Indexes the mobile documents, replacing what an interrupted run left behind. */
export const ingestMobileData = async (esClient: EsClient): Promise<void> => {
  // Data streams only accept `create`, which would keep a leftover document's old body.
  await deleteMobileData(esClient);
  const { errors, items } = await esClient.bulk({
    refresh: 'wait_for',
    operations: documents.flatMap(({ id, index, document }) => [
      { create: { _index: index, _id: id } },
      document,
    ]),
  });
  const failure = items.find((item) => item.create?.error);
  if (errors && failure) {
    throw new Error(`Could not ingest the mobile data: ${JSON.stringify(failure)}`);
  }
};
