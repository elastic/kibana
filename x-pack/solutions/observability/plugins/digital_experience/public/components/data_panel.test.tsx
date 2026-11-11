/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { EDOT_BROWSER_DOCS_URL } from '../utils/doc_links';
import { DataPanel } from './data_panel';

const renderPanel = (props: Partial<React.ComponentProps<typeof DataPanel>> = {}) => {
  return render(
    <DataPanel
      title="Top pages"
      isLoading={false}
      isEmpty={false}
      data-test-subj="testPanel"
      {...props}
    >
      <p>Content</p>
    </DataPanel>,
    { wrapper: EuiProvider }
  );
};

describe('DataPanel', () => {
  it('shows its title, subtitle, actions and content', () => {
    renderPanel({ subtitle: 'The most loaded pages.', actions: <a href="/all">View all</a> });

    expect(screen.getByRole('heading', { level: 2, name: 'Top pages' })).toBeInTheDocument();
    expect(screen.getByText('The most loaded pages.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows a skeleton instead of the content while loading', () => {
    renderPanel({ isLoading: true });

    expect(screen.getByTestId('testPanelLoading')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows the empty message instead of the content, the default one when not given', () => {
    const { rerender } = renderPanel({ isEmpty: true });
    expect(screen.getByTestId('testPanelEmpty')).toHaveTextContent('No data in this time range.');
    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    rerender(
      <DataPanel
        title="Top pages"
        isLoading={false}
        isEmpty
        emptyMessage="No pages."
        data-test-subj="testPanel"
      >
        <p>Content</p>
      </DataPanel>
    );
    expect(screen.getByTestId('testPanelEmpty')).toHaveTextContent('No pages.');
    expect(screen.queryByTestId('testPanelDocsLink')).not.toBeInTheDocument();
  });

  it('links the empty state to the EDOT Browser docs in a new tab when asked', () => {
    renderPanel({ isEmpty: true, showInstrumentationDocs: true });

    const link = screen.getByTestId('testPanelDocsLink');
    expect(link).toHaveAttribute('href', EDOT_BROWSER_DOCS_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });
});
