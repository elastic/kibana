/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFrustrationDashboardAvailable } from './use_frustration_dashboard_available';
import { useKibanaServices } from './use_kibana_services';

jest.mock('./use_kibana_services');

const plugins = { dashboard: {}, lens: {}, dataViews: {} };

const availableWith = (services: Record<string, unknown>) => {
  jest
    .mocked(useKibanaServices)
    .mockReturnValue(services as unknown as ReturnType<typeof useKibanaServices>);
  return renderHook(() => useFrustrationDashboardAvailable()).result.current;
};

describe('useFrustrationDashboardAvailable', () => {
  it('is available with the dashboard, lens and data views plugins', () => {
    expect(availableWith(plugins)).toBe(true);
  });

  it.each(['dashboard', 'lens', 'dataViews'])('is not available without %s', (missing) => {
    expect(availableWith({ ...plugins, [missing]: undefined })).toBe(false);
  });
});
