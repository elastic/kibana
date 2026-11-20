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
 * Mobile applications as `digital_experience_mobile` (synthtrace) writes them, in miniature: a
 * React Native app on both platforms, an Android app and a backend Java service that must never
 * show up as mobile.
 */
export const MOBILE_APPS = {
  reactNative: 'scout-shop-mobile',
  android: 'scout-trailmap-android',
  backendJava: 'scout-backend-java',
  /** In no data at all, for the empty state. */
  noData: 'scout-no-mobile-data',
} as const;

interface MobileDocument {
  serviceName: string;
  sdkName: string;
  sdkLanguage: string;
  osName?: string;
  version: string;
  /** Android `versionCode` and iOS `CFBundleVersion`, apart from the release as the SDKs send it. */
  buildId?: string;
  installationId?: string;
  sessionId: string;
  exception?: boolean;
}

const MOBILE_DOCUMENTS: MobileDocument[] = [
  // React Native, Android: `versionName` as the release, `versionCode` as the build.
  ...['rn-a-1', 'rn-a-2'].map((sessionId, index) => ({
    serviceName: MOBILE_APPS.reactNative,
    sdkName: 'android',
    sdkLanguage: 'java',
    osName: 'Android',
    version: '1.0.0',
    buildId: '10',
    installationId: 'installation-rn-android',
    sessionId,
    exception: index === 0,
  })),
  // React Native, iOS: the same release, with its own build number.
  {
    serviceName: MOBILE_APPS.reactNative,
    sdkName: 'iOS',
    sdkLanguage: 'swift',
    osName: 'iOS',
    version: '1.0.0',
    buildId: '5',
    installationId: 'installation-rn-ios',
    sessionId: 'RN-I-1',
  },
  {
    serviceName: MOBILE_APPS.android,
    sdkName: 'android',
    sdkLanguage: 'java',
    osName: 'Android',
    version: '2.1.0',
    installationId: 'installation-android',
    sessionId: 'android-1',
  },
  {
    serviceName: MOBILE_APPS.backendJava,
    sdkName: 'opentelemetry',
    sdkLanguage: 'java',
    version: '9.9.9',
    sessionId: 'backend-1',
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
        'telemetry.sdk.name': doc.sdkName,
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

/** What the applications route should answer for each mobile application in `TIME_RANGE`. */
export const EXPECTED_MOBILE_ROWS = {
  [MOBILE_APPS.reactNative]: {
    platforms: ['android', 'ios'],
    latestRelease: '1.0.0',
    sessions: { count: 3 },
    users: { count: 2 },
    errorRate: 1 / 3,
  },
  [MOBILE_APPS.android]: {
    platforms: ['android'],
    latestRelease: '2.1.0',
    sessions: { count: 1 },
    users: { count: 1 },
    errorRate: 0,
  },
} as const;

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
