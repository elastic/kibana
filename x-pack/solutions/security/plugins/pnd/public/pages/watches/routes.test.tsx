/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { WatchesRoutes } from './routes';

jest.mock('./activity', () => ({
  WatchesActivityPage: () => <div data-test-subj="pndWatchesActivityPage" />,
}));
jest.mock('./skills', () => ({
  SkillsPage: () => <div data-test-subj="pndSkillsPage" />,
}));
jest.mock('./watch_detail', () => ({
  WatchDetailPage: () => <div data-test-subj="pndWatchDetailPage" />,
}));
jest.mock('./workers', () => ({
  WorkersPage: () => <div data-test-subj="pndWorkersPage" />,
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <WatchesRoutes />
    </MemoryRouter>
  );

/**
 * `Routes` is a react-router v5 `Switch`, so **first match wins and order is load-bearing**: every
 * literal `/watches/<section>` has to stay above `/watches/:watchId`, or the param route reads the
 * section name as a watch id and the section becomes unreachable. That is what these pin.
 */
describe('WatchesRoutes', () => {
  const SECTIONS = [
    ['workers', 'pndWorkersPage'],
    ['skills', 'pndSkillsPage'],
    ['activity', 'pndWatchesActivityPage'],
  ] as const;

  it.each(SECTIONS)('renders the %s section', (section, testId) => {
    renderAt(`/watches/${section}`);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it.each(SECTIONS)('does not let /watches/:watchId swallow /watches/%s', (section) => {
    renderAt(`/watches/${section}`);

    expect(screen.queryByTestId('pndWatchDetailPage')).not.toBeInTheDocument();
  });

  it('renders the watch detail page for a real watch id', () => {
    renderAt('/watches/system-security-watch-deep');

    expect(screen.getByTestId('pndWatchDetailPage')).toBeInTheDocument();
  });

  // There is no overview page: bare /watches redirects to Workers.
  it('redirects bare /watches to the Workers section', () => {
    renderAt('/watches');

    expect(screen.getByTestId('pndWorkersPage')).toBeInTheDocument();
  });

  it('does not render the watch detail page at bare /watches', () => {
    renderAt('/watches');

    expect(screen.queryByTestId('pndWatchDetailPage')).not.toBeInTheDocument();
  });
});
