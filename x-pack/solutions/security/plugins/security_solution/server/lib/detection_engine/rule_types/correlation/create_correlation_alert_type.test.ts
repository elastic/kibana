/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CORRELATION_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';
import { createCorrelationAlertType } from './create_correlation_alert_type';
import { correlationExecutor } from './correlation';

jest.mock('./correlation', () => ({
  correlationExecutor: jest.fn(),
}));

const correlationExecutorMock = correlationExecutor as jest.MockedFunction<
  typeof correlationExecutor
>;

describe('createCorrelationAlertType', () => {
  const alertType = createCorrelationAlertType();

  it('returns id equal to CORRELATION_RULE_TYPE_ID', () => {
    expect(alertType.id).toBe(CORRELATION_RULE_TYPE_ID);
  });

  it('has name set to "Correlation Rule"', () => {
    expect(alertType.name).toBe('Correlation Rule');
  });

  it('has minimumLicenseRequired set to "basic"', () => {
    expect(alertType.minimumLicenseRequired).toBe('basic');
  });

  it('has isExportable set to false', () => {
    expect(alertType.isExportable).toBe(false);
  });

  it('has producer set to SERVER_APP_ID', () => {
    expect(alertType.producer).toBe(SERVER_APP_ID);
  });

  it('has solution set to "security"', () => {
    expect(alertType.solution).toBe('security');
  });

  it('has defaultActionGroupId set to "default"', () => {
    expect(alertType.defaultActionGroupId).toBe('default');
  });

  it('has a callable validate.params.validate function', () => {
    expect(typeof alertType.validate?.params?.validate).toBe('function');
  });

  it('executor forwards licensing and scheduleNotificationResponseActionsService from sharedParams', async () => {
    const mockLicensing = { isAvailable: true };
    const mockScheduleService = jest.fn();
    const mockParams = {
      sharedParams: {
        licensing: mockLicensing,
        scheduleNotificationResponseActionsService: mockScheduleService,
      },
      someOtherParam: 'value',
    } as unknown as Parameters<typeof alertType.executor>[0];

    await alertType.executor(mockParams);

    expect(correlationExecutorMock).toHaveBeenCalledWith({
      ...mockParams,
      licensing: mockLicensing,
      scheduleNotificationResponseActionsService: mockScheduleService,
    });
  });
});
