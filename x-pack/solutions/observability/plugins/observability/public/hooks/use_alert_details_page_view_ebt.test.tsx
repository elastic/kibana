/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAlertDetailsPageViewEbt } from './use_alert_details_page_view_ebt';
import { useKibana } from '../utils/kibana_react';

jest.mock('../utils/kibana_react', () => ({
  useKibana: jest.fn(),
}));

describe('useAlertDetailsPageViewEbt', () => {
  const getServices = (reportAlertDetailsPageView: jest.Mock) => ({
    services: { telemetryClient: { reportAlertDetailsPageView } },
  });

  it('fires event when ruleType provided', () => {
    const reportAlertDetailsPageView = jest.fn();
    (useKibana as jest.Mock).mockReturnValue(getServices(reportAlertDetailsPageView));

    renderHook(() => useAlertDetailsPageViewEbt({ ruleType: 'logs.alert.document.count' }));

    expect(reportAlertDetailsPageView).toHaveBeenCalledWith('logs.alert.document.count');
  });
});
