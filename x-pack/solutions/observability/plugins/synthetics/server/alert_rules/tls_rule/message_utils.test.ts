/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath } from '@kbn/core/server';
import {
  getTLSCertAlertId,
  getTLSAlertContext,
  setTLSRecoveredAlertsContext,
} from './message_utils';
import type { TLSLatestPing } from './tls_rule_executor';

describe('getTLSCertAlertId', () => {
  it('uses the sha256 fingerprint for lightweight certificates', () => {
    expect(
      getTLSCertAlertId({ sha256: 'abc123', common_name: 'example.com', issuer: 'Test CA' })
    ).toBe('abc123');
  });

  it('falls back to common name + issuer for fingerprint-free browser certificates', () => {
    expect(getTLSCertAlertId({ common_name: 'example.com', issuer: "Let's Encrypt" })).toBe(
      "browser-cert:example.com:Let's Encrypt"
    );
  });

  it('handles a browser certificate with a missing issuer', () => {
    expect(getTLSCertAlertId({ common_name: 'example.com' })).toBe('browser-cert:example.com:');
  });

  it('returns undefined when neither a fingerprint nor a common name is available', () => {
    expect(getTLSCertAlertId({})).toBeUndefined();
  });
});

describe('getTLSAlertContext', () => {
  const basePath = {
    publicBaseUrl: 'https://localhost:5601',
  } as IBasePath;

  const summary = {
    summary: 'Certificate expires soon',
    status: 'expiring',
    sha256: 'cert-1-sha256',
    commonName: 'cert-1',
    issuer: 'test-issuer',
    monitorName: 'test-monitor',
    monitorId: '12345',
    serviceName: 'test-service',
    monitorType: 'HTTP',
    locationId: 'us-east',
    locationName: 'US East',
    monitorUrl: 'https://example.com',
    configId: '12345',
    monitorTags: [],
    lastErrorMessage: undefined,
    lastErrorStack: undefined,
    labels: {},
    reason: 'Certificate expires soon',
    hostName: 'host-1',
    checkedAt: '2026-01-01T00:00:00.000Z',
  };

  it('sets alertDetailsUrl and viewInAppUrl alongside alert summary fields', async () => {
    await expect(
      getTLSAlertContext({
        basePath,
        spaceId: 'default',
        summary,
        alertUuid: 'alert-id',
      })
    ).resolves.toEqual({
      alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
      viewInAppUrl:
        'https://localhost:5601/app/synthetics/certificates?search=cert-1&issuers=%5B%22test-issuer%22%5D',
      ...summary,
    });
  });

  it('includes the space id in viewInAppUrl for non-default spaces', async () => {
    await expect(
      getTLSAlertContext({
        basePath,
        spaceId: 'team-a',
        summary,
        alertUuid: 'alert-id',
      })
    ).resolves.toMatchObject({
      viewInAppUrl:
        'https://localhost:5601/s/team-a/app/synthetics/certificates?search=cert-1&issuers=%5B%22test-issuer%22%5D',
    });
  });
});

describe('setTLSRecoveredAlertsContext', () => {
  const timestamp = new Date().toISOString();
  const alertUuid = 'alert-id';
  const configId = '12345';
  const basePath = {
    publicBaseUrl: 'https://localhost:5601',
  } as IBasePath;

  const alertState = {
    summary: 'test-summary',
    status: 'has expired',
    sha256: 'cert-1-sha256',
    commonName: 'cert-1',
    issuer: 'test-issuer',
    monitorName: 'test-monitor',
    monitorType: 'test-monitor-type',
    locationName: 'test-location-name',
    monitorUrl: 'test-monitor-url',
    configId,
  };

  it('sets context correctly when monitor cert has been updated', async () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => alertUuid,
            getState: () => alertState,
            setContext: jest.fn(),
            getUuid: () => alertUuid,
            getStart: () => new Date().toISOString(),
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    await setTLSRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      latestPings: [
        {
          config_id: configId,
          '@timestamp': timestamp,
          tls: {
            server: {
              hash: {
                sha256: 'cert-2-sha256',
              },
              x509: {
                subject: {
                  common_name: 'cert-2',
                },
                not_after: timestamp,
              },
            },
          },
        } as TLSLatestPing,
      ],
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      context: {
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        viewInAppUrl:
          'https://localhost:5601/app/synthetics/certificates?search=cert-1&issuers=%5B%22test-issuer%22%5D',
        commonName: 'cert-1',
        configId: '12345',
        issuer: 'test-issuer',
        locationName: 'test-location-name',
        monitorName: 'test-monitor',
        monitorType: 'test-monitor-type',
        monitorUrl: 'test-monitor-url',
        newStatus: expect.stringContaining('Certificate cert-2 Expired on'),
        previousStatus: 'Certificate cert-1 test-summary',
        sha256: 'cert-1-sha256',
        status: 'has expired',
        summary: 'Monitor certificate has been updated.',
      },
      id: 'alert-id',
    });
  });

  it('sets context correctly when monitor cert expiry/age threshold has been updated', async () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => alertUuid,
            getState: () => alertState,
            setContext: jest.fn(),
            getUuid: () => alertUuid,
            getStart: () => new Date().toISOString(),
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    await setTLSRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      latestPings: [
        {
          config_id: configId,
          '@timestamp': timestamp,
          tls: {
            server: {
              hash: {
                sha256: 'cert-1-sha256',
              },
              x509: {
                subject: {
                  common_name: 'cert-1',
                },
                not_after: timestamp,
              },
            },
          },
        } as TLSLatestPing,
      ],
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      context: {
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        viewInAppUrl:
          'https://localhost:5601/app/synthetics/certificates?search=cert-1&issuers=%5B%22test-issuer%22%5D',
        commonName: 'cert-1',
        configId: '12345',
        issuer: 'test-issuer',
        locationName: 'test-location-name',
        monitorName: 'test-monitor',
        monitorType: 'test-monitor-type',
        monitorUrl: 'test-monitor-url',
        newStatus: 'Certificate cert-1 test-summary',
        previousStatus: 'Certificate cert-1 test-summary',
        sha256: 'cert-1-sha256',
        status: 'has expired',
        summary: 'Expiry/Age threshold has been updated.',
      },
      id: 'alert-id',
    });
  });

  it('sets a fingerprint-free recovery context for a recovered browser certificate', async () => {
    // Browser certs carry no sha256, so the recovery path cannot reconcile them
    // against a summary ping and emits a generic message instead.
    const browserAlertState = { ...alertState, sha256: '', commonName: 'browser-cert-cn' };
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => alertUuid,
            getState: () => browserAlertState,
            setContext: jest.fn(),
            getUuid: () => alertUuid,
            getStart: () => new Date().toISOString(),
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    await setTLSRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      latestPings: [],
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: 'alert-id',
      context: expect.objectContaining({
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        viewInAppUrl:
          'https://localhost:5601/app/synthetics/certificates?search=browser-cert-cn&issuers=%5B%22test-issuer%22%5D',
        commonName: 'browser-cert-cn',
        previousStatus: 'Certificate browser-cert-cn test-summary',
        newStatus: expect.stringContaining('browser-cert-cn'),
        summary: 'Monitor certificate has been updated or is no longer within the alert threshold.',
      }),
    });
  });
});
