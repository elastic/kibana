/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DigitalExperienceLayout } from './digital_experience_layout';
import { useRouteBreadcrumb } from '../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';
import { useDigitalExperienceRouter } from '../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../routes';

jest.mock('@kbn/typed-react-router-config', () => ({
  ...jest.requireActual('@kbn/typed-react-router-config'),
  Outlet: () => null,
}));
jest.mock('../breadcrumbs/use_route_breadcrumb');
jest.mock('../hooks/use_kibana_services');
jest.mock('../hooks/use_time_range');
jest.mock('../hooks/use_digital_experience_router');

const HREF = '/app/digital_experience/?rangeFrom=now-7d&rangeTo=now';

const render = () => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);

  renderHook(() => DigitalExperienceLayout());
};

describe('DigitalExperienceLayout', () => {
  it('registers Digital Experience › Applications, both linking to the list with the time range', () => {
    render();

    expect(useRouteBreadcrumb).toHaveBeenCalledWith([
      { text: 'Digital experience', href: HREF },
      { text: 'Applications', href: HREF },
    ]);
  });
});
