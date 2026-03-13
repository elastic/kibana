/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { OverviewTab } from './overview_tab';

jest.mock('../components/ai_summary_section', () => ({
  AiSummarySection: () => <div data-test-subj="aiSummarySection">{'AiSummarySection'}</div>,
}));

jest.mock('../components/about_section', () => ({
  AboutSection: () => <div>{'AboutSection'}</div>,
}));

jest.mock('../components/investigation_section', () => ({
  InvestigationSection: () => <div>{'InvestigationSection'}</div>,
}));

jest.mock('../components/visualizations_section', () => ({
  VisualizationsSection: () => <div>{'VisualizationsSection'}</div>,
}));

const createMockHit = (eventKind: string): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: 'event-id' },
    flattened: {
      'event.kind': eventKind,
    },
    isAnchor: false,
  } as DataTableRecord);

describe('OverviewTab', () => {
  it('renders AI summary section for alerts', () => {
    render(
      <IntlProvider locale="en">
        <OverviewTab hit={createMockHit('signal')} renderCellActions={jest.fn() as never} />
      </IntlProvider>
    );

    expect(screen.getByTestId('aiSummarySection')).toBeInTheDocument();
  });

  it('does not render AI summary section for non-alert documents', () => {
    render(
      <IntlProvider locale="en">
        <OverviewTab hit={createMockHit('event')} renderCellActions={jest.fn() as never} />
      </IntlProvider>
    );

    expect(screen.queryByTestId('aiSummarySection')).not.toBeInTheDocument();
  });
});
