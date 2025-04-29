/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { tlsAlertFactory, getCertSummary } from './tls';
import { CertResult } from '../../../../common/runtime_types';
import { createRuleTypeMocks, bootstrapDependencies } from './test_utils';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

import { savedObjectsAdapter, UMSavedObjectsAdapter } from '../saved_objects/saved_objects';

/**
 * This function aims to provide an easy way to give mock props that will
 * reduce boilerplate for tests.
 * @param params the params received at alert creation time
 * @param state the state the alert maintains
 */

const mockCertResult: CertResult = {
  certs: [
    {
      not_after: '2020-07-16T03:15:39.000Z',
      not_before: '2019-07-24T03:15:39.000Z',
      issuer: 'Sample issuer',
      common_name: 'Common-One',
      monitors: [{ name: 'monitor-one', id: 'monitor1' }],
      sha256: 'abc',
    },
    {
      not_after: '2020-07-18T03:15:39.000Z',
      not_before: '2019-07-20T03:15:39.000Z',
      issuer: 'Sample issuer',
      common_name: 'Common-Two',
      monitors: [{ name: 'monitor-two', id: 'monitor2' }],
      sha256: 'bcd',
    },
    {
      not_after: '2020-07-19T03:15:39.000Z',
      not_before: '2019-07-22T03:15:39.000Z',
      issuer: 'Sample issuer',
      common_name: 'Common-Three',
      monitors: [{ name: 'monitor-three', id: 'monitor3' }],
      sha256: 'cde',
    },
    {
      not_after: '2020-07-25T03:15:39.000Z',
      not_before: '2019-07-25T03:15:39.000Z',
      issuer: 'Sample issuer',
      common_name: 'Common-Four',
      monitors: [{ name: 'monitor-four', id: 'monitor4' }],
      sha256: 'def',
    },
  ],
  total: 4,
};

const mockRecoveredAlerts = [
  {
    id: 'recovered-1',
    alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    commonName: mockCertResult.certs[0].common_name ?? '',
    issuer: mockCertResult.certs[0].issuer ?? '',
    summary: 'sample summary',
    status: 'expired',
  },
  {
    id: 'recovered-2',
    alertDetailsUrl: 'mockedAlertsLocator > getLocation',
    commonName: mockCertResult.certs[1].common_name ?? '',
    issuer: mockCertResult.certs[1].issuer ?? '',
    summary: 'sample summary 2',
    status: 'aging',
  },
];

const mockOptions = (state = {}, recoveredAlerts: typeof mockRecoveredAlerts = []): any => {
  const { services, setContext } = createRuleTypeMocks(mockRecoveredAlerts);
  const params = {
    timerange: { from: 'now-15m', to: 'now' },
  };

  services.alertsClient.report.mockImplementation((param: any) => {
    return {
      uuid: `uuid-${param.id}`,
      start: new Date().toISOString(),
      alertDoc: {},
    };
  });

  services.alertsClient.getRecoveredAlerts.mockImplementation((param: any) => {
    return recoveredAlerts.map((alert) => ({
      alert: {
        getId: () => alert.id,
        getUuid: () => 'mock-uuid',
        getState: () => alert,
        getStart: () => new Date().toISOString(),
        setContext,
        context: {},
      },
    }));
  });

  return {
    params,
    state,
    services,
    setContext,
    startedAt: new Date(),
  };
};

describe('tls alert', () => {
  let toISOStringSpy: jest.SpyInstance<string, []>;
  let savedObjectsAdapterSpy: jest.SpyInstance<
    ReturnType<UMSavedObjectsAdapter['getUptimeDynamicSettings']>
  >;
  const mockDate = 'date';
  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(new Date('2021-05-13T12:33:37.000Z'));
  });

  describe('alert executor', () => {
    beforeEach(() => {
      toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString');
      savedObjectsAdapterSpy = jest.spyOn(savedObjectsAdapter, 'getUptimeDynamicSettings');
    });

    it('triggers when aging or expiring alerts are found', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const mockGetter: jest.Mock<CertResult> = jest.fn();

      mockGetter.mockReturnValue(mockCertResult);
      const { server, libs, plugins } = bootstrapDependencies({ getCerts: mockGetter });
      const alert = tlsAlertFactory(server, libs, plugins);
      const options = mockOptions();
      const {
        services: { alertsClient },
      } = options;
      await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(alertsClient.report).toHaveBeenCalledTimes(4);
      mockCertResult.certs.forEach((cert) => {
        const context = {
          commonName: cert.common_name,
          issuer: cert.issuer,
          status: 'expired',
        };

        expect(alertsClient.report).toBeCalledWith({
          id: `${cert.common_name}-${cert.issuer?.replace(/\s/g, '_')}-${cert.sha256}`,
          actionGroup: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
          state: expect.objectContaining(context),
        });

        expect(alertsClient.setAlertData).toBeCalledWith({
          id: `${cert.common_name}-${cert.issuer?.replace(/\s/g, '_')}-${cert.sha256}`,
          context: expect.objectContaining(context),
          payload: expect.objectContaining({
            'tls.server.x509.subject.common_name': cert.common_name,
            'tls.server.x509.issuer.common_name': cert.issuer,
            'tls.server.x509.not_after': cert.not_after,
            'tls.server.x509.not_before': cert.not_before,
            'tls.server.hash.sha256': cert.sha256,
          }),
        });
      });

      expect(alertsClient.report).toHaveBeenCalledTimes(4);
      expect(alertsClient.setAlertData).toHaveBeenCalledTimes(4);

      expect(mockGetter).toBeCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          size: 1000,
          notValidAfter: `now+${DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold}d`,
          notValidBefore: `now-${DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold}d`,
          sortBy: 'common_name',
          direction: 'desc',
        })
      );
    });

    it('does not trigger when cert is not considered aging or expiring', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const mockGetter: jest.Mock<CertResult> = jest.fn();

      mockGetter.mockReturnValue({
        certs: [
          {
            not_after: '2021-07-16T03:15:39.000Z',
            not_before: '2019-07-24T03:15:39.000Z',
            issuer: 'Sample issuer',
            common_name: 'Common-One',
            monitors: [{ name: 'monitor-one', id: 'monitor1' }],
            sha256: 'abc',
          },
          {
            not_after: '2021-07-18T03:15:39.000Z',
            not_before: '2019-07-20T03:15:39.000Z',
            issuer: 'Sample issuer',
            common_name: 'Common-Two',
            monitors: [{ name: 'monitor-two', id: 'monitor2' }],
            sha256: 'bcd',
          },
          {
            not_after: '2021-07-19T03:15:39.000Z',
            not_before: '2019-07-22T03:15:39.000Z',
            issuer: 'Sample issuer',
            common_name: 'Common-Three',
            monitors: [{ name: 'monitor-three', id: 'monitor3' }],
            sha256: 'cde',
          },
          {
            not_after: '2021-07-25T03:15:39.000Z',
            not_before: '2019-07-25T03:15:39.000Z',
            issuer: 'Sample issuer',
            common_name: 'Common-Four',
            monitors: [{ name: 'monitor-four', id: 'monitor4' }],
            sha256: 'def',
          },
        ],
        total: 4,
      });
      const { server, libs, plugins } = bootstrapDependencies({ getCerts: mockGetter });
      const alert = tlsAlertFactory(server, libs, plugins);
      const options = mockOptions();
      const {
        services: { alertsClient },
      } = options;
      await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(alertsClient.report).toHaveBeenCalledTimes(0);
      expect(mockGetter).toBeCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          size: 1000,
          notValidAfter: `now+${DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold}d`,
          notValidBefore: `now-${DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold}d`,
          sortBy: 'common_name',
          direction: 'desc',
        })
      );
    });

    it('handles dynamic settings for aging or expiration threshold', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const certSettings = {
        certAgeThreshold: 10,
        certExpirationThreshold: 5,
        heartbeatIndices: 'heartbeat-*',
        defaultConnectors: [],
      };
      savedObjectsAdapterSpy.mockImplementation(() => certSettings);
      const mockGetter: jest.Mock<CertResult> = jest.fn();

      mockGetter.mockReturnValue(mockCertResult);
      const { server, libs, plugins } = bootstrapDependencies({ getCerts: mockGetter });
      const alert = tlsAlertFactory(server, libs, plugins);
      const options = mockOptions();
      await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(mockGetter).toBeCalledWith(
        expect.objectContaining({
          notValidAfter: `now+${certSettings.certExpirationThreshold}d`,
          notValidBefore: `now-${certSettings.certAgeThreshold}d`,
        })
      );
    });

    it('sets alert recovery context for recovered alerts', async () => {
      toISOStringSpy.mockImplementation(() => 'foo date string');
      const mockGetter: jest.Mock<CertResult> = jest.fn();

      mockGetter.mockReturnValue(mockCertResult);
      const { server, libs, plugins } = bootstrapDependencies({ getCerts: mockGetter });
      const alert = tlsAlertFactory(server, libs, plugins);
      const options = mockOptions(undefined, mockRecoveredAlerts);
      // @ts-ignore the executor can return `void`, but ours never does
      const {
        services: { alertsClient },
      } = options;
      await alert.executor(options);
      expect(alertsClient.setAlertData).toHaveBeenCalledTimes(6);
      mockRecoveredAlerts.forEach((recoveredAlert) => {
        expect(alertsClient.setAlertData).toHaveBeenCalledWith({
          id: recoveredAlert.id,
          context: recoveredAlert,
        });
      });
    });
  });

  describe('getCertSummary', () => {
    let diffSpy: jest.SpyInstance<any, unknown[]>;

    beforeEach(() => {
      diffSpy = jest.spyOn(moment.prototype, 'diff');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('handles positive diffs for expired certs appropriately', () => {
      diffSpy.mockReturnValueOnce(900);
      const result = getCertSummary(
        mockCertResult.certs[0],
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCertResult.certs[0].common_name,
        issuer: mockCertResult.certs[0].issuer,
        summary: 'expired on Jul 15, 2020 EDT, 900 days ago.',
        status: 'expired',
      });
    });

    it('handles positive diffs for agining certs appropriately', () => {
      diffSpy.mockReturnValueOnce(702);
      const result = getCertSummary(
        mockCertResult.certs[0],
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCertResult.certs[0].common_name,
        issuer: mockCertResult.certs[0].issuer,
        summary: 'valid since Jul 23, 2019 EDT, 702 days ago.',
        status: 'becoming too old',
      });
    });

    it('handles negative diff values appropriately for aging certs', () => {
      diffSpy.mockReturnValueOnce(-90);
      const result = getCertSummary(
        mockCertResult.certs[0],
        new Date('2020-07-01T12:00:00.000Z').valueOf(),
        new Date('2019-09-01T03:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCertResult.certs[0].common_name,
        issuer: mockCertResult.certs[0].issuer,
        summary: 'invalid until Jul 23, 2019 EDT, 90 days from now.',
        status: 'invalid',
      });
    });

    it('handles negative diff values appropriately for expiring certs', () => {
      diffSpy
        // negative days are in the future, positive days are in the past
        .mockReturnValueOnce(-96);
      const result = getCertSummary(
        mockCertResult.certs[0],
        new Date('2020-07-20T05:00:00.000Z').valueOf(),
        new Date('2019-03-01T00:00:00.000Z').valueOf()
      );
      expect(result).toEqual({
        commonName: mockCertResult.certs[0].common_name,
        issuer: mockCertResult.certs[0].issuer,
        summary: 'expires on Jul 15, 2020 EDT in 96 days.',
        status: 'expiring',
      });
    });
  });
});
