/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as testLibRender } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { MetricItemExtra } from './metric_item_extra';

jest.setTimeout(30_000);

const render = (ui: React.ReactElement) =>
  testLibRender(
    <I18nProvider>
      <EuiThemeProvider>{ui}</EuiThemeProvider>
    </I18nProvider>
  );

describe('<MetricItemExtra />', () => {
  it('renders the tooltip when there is content', () => {
    const { getByText } = render(
      <MetricItemExtra
        stats={{ medianDuration: 10, avgDuration: 10, minDuration: 5, maxDuration: 15 }}
      />
    );
    expect(getByText('Duration')).toBeInTheDocument();
    fireEvent.mouseOver(getByText('Info'));
    expect(getByText('Median duration of last 50 checks')).toBeInTheDocument();
  });

  it('renders the empty tooltip when there is no content', () => {
    const { getByText } = render(
      <MetricItemExtra
        stats={{
          medianDuration: null,
          avgDuration: null,
          minDuration: null,
          maxDuration: null,
        }}
      />
    );
    expect(getByText('Duration')).toBeInTheDocument();
    fireEvent.mouseOver(getByText('Info'));
    expect(getByText('Metric data is not available')).toBeInTheDocument();
  });
});
