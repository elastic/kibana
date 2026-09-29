/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useAlertDetailsPageViewEbt } from './use_alert_details_page_view_ebt';
import { useKibana } from '../utils/kibana_react';

vi.mock('../utils/kibana_react', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useAlertDetailsPageViewEbt', () => {
  const getServices = (reportAlertDetailsPageView: Mock) => ({
    services: { telemetryClient: { reportAlertDetailsPageView } },
  });

  it('fires event when ruleType provided', () => {
    const reportAlertDetailsPageView = vi.fn();
    (useKibana as Mock).mockReturnValue(getServices(reportAlertDetailsPageView));

    renderHook(() => useAlertDetailsPageViewEbt({ ruleType: 'logs.alert.document.count' }));

    expect(reportAlertDetailsPageView).toHaveBeenCalledWith('logs.alert.document.count');
  });
});
