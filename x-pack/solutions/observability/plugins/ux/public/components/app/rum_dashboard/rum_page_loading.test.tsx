/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RumPageLoadingBar, RumPageLoadingProvider, useRumPageLoading } from './rum_page_loading';

function Probe({ loading }: { loading: boolean }) {
  useRumPageLoading('probe', loading);
  return <RumPageLoadingBar />;
}

function App({ loading }: { loading: boolean }) {
  return (
    <RumPageLoadingProvider>
      <Probe loading={loading} />
    </RumPageLoadingProvider>
  );
}

describe('RumPageLoadingBar', () => {
  it('shows while a panel is loading and hides when it finishes', () => {
    const { rerender, queryByTestId } = render(<App loading={true} />);

    expect(queryByTestId('uxPageLoadingBar')).toBeInTheDocument();

    rerender(<App loading={false} />);

    expect(queryByTestId('uxPageLoadingBar')).not.toBeInTheDocument();
  });
});
