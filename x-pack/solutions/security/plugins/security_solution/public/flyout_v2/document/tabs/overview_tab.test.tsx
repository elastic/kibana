/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { OverviewTab } from './overview_tab';
import { TestProviders } from '../../../common/mock';

const createHit = (): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened: {},
    isAnchor: false,
  } as DataTableRecord);

jest.mock('../components/about_section', () => ({ AboutSection: () => <div /> }));
jest.mock('../components/insights_section', () => ({ InsightsSection: () => <div /> }));
jest.mock('../components/investigation_section', () => ({ InvestigationSection: () => <div /> }));
jest.mock('../components/visualizations_section', () => ({ VisualizationsSection: () => <div /> }));

describe('<OverviewTab />', () => {
  it('renders the overview sections', () => {
    const { container } = render(
      <TestProviders>
        <OverviewTab hit={createHit()} renderCellActions={jest.fn()} />
      </TestProviders>
    );

    expect(container).toBeInTheDocument();
  });
});
