/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent } from '@testing-library/react';
import React from 'react';
import type { AppContextTestRender } from '../../../test';
import { createAppRootMockRenderer } from '../../../test';
import { clusterResponseMock } from '../mocks';
import { TreeNav } from '.';
import { TreeViewContextProvider } from '../contexts';

describe('TreeNav component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];

  const defaultProps = {
    globalFilter: {
      startDate: Date.now().toString(),
      endDate: (Date.now() + 1).toString(),
    },
    onSelect: () => {},
    hasSelection: false,
  };

  const TreeNavContainer = () => (
    <TreeViewContextProvider {...defaultProps}>
      <TreeNav />
    </TreeViewContextProvider>
  );

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    mockedApi.mockResolvedValue(clusterResponseMock);
  });

  it('mount with Logical View selected by default', async () => {
    renderResult = mockedContext.render(<TreeNavContainer />);
    const elemLabel = await renderResult.getByTestId('treeNavType_generated-idlogical');
    expect(elemLabel).toHaveAttribute('aria-pressed', 'true');
  });
  it('shows the tree path according with the selected view type', async () => {
    renderResult = mockedContext.render(<TreeNavContainer />);

    const logicalViewPath = 'cluster / namespace / pod / container image';
    const infrastructureViewPath = 'cluster / node / pod / container image';

    // Check initial state - logical view is selected
    expect(renderResult.getByText(logicalViewPath)).toBeInTheDocument();

    const infraButton = renderResult.getByRole('button', { name: /infrastructure/i });
    fireEvent.click(infraButton);

    expect(renderResult.getByText(infrastructureViewPath)).toBeInTheDocument();

    // Click back to logical view
    const logicalButton = renderResult.getByRole('button', { name: /logical/i });
    fireEvent.click(logicalButton);

    // Verify back to logical view
    expect(renderResult.getByText(logicalViewPath)).toBeInTheDocument();
  });

  it('toggles tree nav visibility using display style when collapse/expand buttons are clicked', async () => {
    renderResult = mockedContext.render(<TreeNavContainer />);

    // Find the main content div that contains the tree navigation
    const treeContent = renderResult.container.querySelector('div[style*="display"]');
    expect(treeContent).toBeInTheDocument();

    // Initial state: content should be visible (display: inherit)
    expect(treeContent).toHaveStyle('display: inherit');

    // Find and click the collapse button
    const collapseBtn = renderResult.getByLabelText(/collapse/i);
    fireEvent.click(collapseBtn);

    // After collapse: content should be hidden (display: none)
    expect(treeContent).toHaveStyle('display: none');

    // Find and click the expand button
    const expandBtn = renderResult.getByLabelText(/expand/i);
    fireEvent.click(expandBtn);

    // After expand: content should be visible again (display: inherit)
    expect(treeContent).toHaveStyle('display: inherit');
  });
});
