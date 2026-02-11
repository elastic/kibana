/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SummaryViewContent } from './summary_view_content';
import { TestProviders } from '../../../../common/mock';

jest.mock('./attacks_volume_panel/attacks_volume_panel', () => ({
  AttacksVolumePanel: () => <div data-test-subj="mock-attacks-volume-panel" />,
}));

jest.mock('./attacks_list_panel/attacks_list_panel', () => ({
  AttacksListPanel: () => <div data-test-subj="mock-attacks-list-panel" />,
}));

describe('<SummaryViewContent />', () => {
  const defaultProps = {
    filters: [],
    query: undefined,
    dataView: {} as DataView,
  };

  it('renders summary view content', () => {
    render(
      <TestProviders>
        <SummaryViewContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('summary-view-content')).toBeInTheDocument();
  });

  it('renders AttacksVolumePanel', () => {
    render(
      <TestProviders>
        <SummaryViewContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-attacks-volume-panel')).toBeInTheDocument();
  });

  it('renders AttacksListPanel', () => {
    render(
      <TestProviders>
        <SummaryViewContent {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mock-attacks-list-panel')).toBeInTheDocument();
  });
});
