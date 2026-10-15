/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useDigitalExperienceBreadcrumbs } from './use_digital_experience_breadcrumbs';
import { useKibanaServices } from './use_kibana_services';

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('./use_kibana_services');

const timeRange = { rangeFrom: 'now-7d', rangeTo: 'now' };
const ROOT_HREF = '/app/digital_experience/?rangeFrom=now-7d&rangeTo=now';

describe('useDigitalExperienceBreadcrumbs', () => {
  beforeEach(() => {
    jest.mocked(useKibanaServices).mockReturnValue({
      application: {
        getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
      },
    } as unknown as ReturnType<typeof useKibanaServices>);
  });

  it('sets [Digital Experience, Applications] for the Applications list', () => {
    renderHook(() => useDigitalExperienceBreadcrumbs({ timeRange }));

    expect(useBreadcrumbs).toHaveBeenLastCalledWith([
      { text: 'Digital Experience' },
      { text: 'Applications' },
    ]);
  });

  it('sets the linked trail for an Application view, keeping the time range', () => {
    renderHook(() => useDigitalExperienceBreadcrumbs({ serviceName: 'my-app', timeRange }));

    expect(useBreadcrumbs).toHaveBeenLastCalledWith([
      { text: 'Digital Experience', href: ROOT_HREF },
      { text: 'Applications', href: ROOT_HREF },
      { text: 'my-app' },
      { text: 'Overview' },
    ]);
  });
});
