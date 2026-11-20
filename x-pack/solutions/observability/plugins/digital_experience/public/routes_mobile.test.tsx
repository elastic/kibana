/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import { Outlet, RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { digitalExperienceRouter } from './routes';
import { useKibanaServices } from './hooks/use_kibana_services';
import { useDigitalExperienceRouter } from './hooks/use_digital_experience_router';

jest.mock('./hooks/use_kibana_services');
jest.mock('./hooks/use_digital_experience_router');
jest.mock('./application/digital_experience_layout', () => ({
  DigitalExperienceLayout: () => <Outlet />,
}));
jest.mock('./pages/application_details/application_page', () => ({
  ApplicationPage: ({ source, platform }: { source: string; platform?: string }) => (
    <div data-test-subj="applicationPage">{`${source}:${platform}`}</div>
  ),
}));

const renderRoute = () => {
  jest.mocked(useKibanaServices).mockReturnValue({} as ReturnType<typeof useKibanaServices>);
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
  const history = createMemoryHistory({
    initialEntries: ['/shop-mobile?source=otel&platform=ios'],
  });
  render(
    <RouterProvider
      history={history}
      router={digitalExperienceRouter as unknown as ComponentProps<typeof RouterProvider>['router']}
    >
      <RouteRenderer />
    </RouterProvider>
  );
  return history;
};

describe('the mobile application route', () => {
  it('gives the page the EDOT source and the mobile platform, and keeps both in the URL', async () => {
    const history = renderRoute();

    expect(await screen.findByTestId('applicationPage')).toHaveTextContent('otel:ios');
    expect(history.location.search).toBe('?source=otel&platform=ios');
  });
});
