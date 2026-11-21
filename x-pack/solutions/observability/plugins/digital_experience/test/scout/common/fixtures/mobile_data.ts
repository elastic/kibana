/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';

const INDEX = 'logs-generic.otel-default';

/** Inside `TIME_RANGE`. */
const TIMESTAMP = '2021-01-18T12:30:00.000Z';

/**
 * Mobile applications as EDOT Android and iOS send them, in miniature: the Elastic distribution
 * (`telemetry.distro.name: elastic`) on a mobile `os.name`, with the upstream `telemetry.sdk.*`.
 * A React Native app on Android, iOS and iPadOS, an Android app, an Android app on an SDK that
 * still sends `telemetry.sdk.name: android` without the distribution, and two services that must
 * never show up as mobile: a backend Java service, and EDOT Browser on an iPhone, which is the Elastic
 * distribution on `os.name: iOS` too.
 */
export const MOBILE_APPS = {
  reactNative: 'scout-shop-mobile',
  android: 'scout-trailmap-android',
  legacyAndroid: 'scout-legacy-android',
  backendJava: 'scout-backend-java',
  browserOnIphone: 'scout-browser-on-iphone',
  /** In no data at all, for the empty state. */
  noData: 'scout-no-mobile-data',
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
  // React Native on an iPhone and an iPad: the same release, the iOS platform both.
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
  },
  // Most sessions still on 2.9.0, the newest release 2.10.0, which only a version sort puts last.
  ...[
    { version: '2.9.0', sessionId: 'android-1' },
    { version: '2.9.0', sessionId: 'android-2' },
    { version: '2.10.0', sessionId: 'android-3' },
  ].map(({ version, sessionId }) => ({
    ...EDOT_MOBILE,
    serviceName: MOBILE_APPS.android,
    sdkLanguage: 'java',
    osName: 'Android',
    version,
    installationId: `installation-${sessionId}`,
    sessionId,
  })),
  {
    serviceName: MOBILE_APPS.legacyAndroid,
    sdkName: 'android',
    sdkLanguage: 'java',
    version: '0.9.0',
    installationId: 'installation-legacy-android',
    sessionId: 'legacy-1',
  },
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

const documents = MOBILE_DOCUMENTS.map((doc, index) => ({
  id: `dx-mobile-${index}`,
  document: {
    '@timestamp': TIMESTAMP,
    event_name: doc.exception ? 'exception' : 'app.screen',
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
    // The newest release, not the one with the most sessions.
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
] as const;

/** Deletes the mobile documents by their ids, leaving the rest of the data stream. */
export const deleteMobileData = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: INDEX,
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
    operations: documents.flatMap(({ id, document }) => [
      { create: { _index: INDEX, _id: id } },
      document,
    ]),
  });
  const failure = items.find((item) => item.create?.error);
  if (errors && failure) {
    throw new Error(`Could not ingest the mobile data: ${JSON.stringify(failure)}`);
  }
};
