/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TimelineResizableLayout from './resizable_layout';

const TestSideBarPanel = <div data-test-subj="sidebar__panel">{'Sidebar Panel'}</div>;

const MainPanel = <div data-test-subj="main__panel">{'Main Panel'}</div>;

const container = document.createElement('div');
container.style.width = '1000px';
container.style.height = '1000px';
container.getBoundingClientRect = jest.fn(() => {
  return {
    width: 1000,
    height: 1000,
    x: 0,
    y: 0,
  } as DOMRect;
});

const TestComponent = () => {
  return (
    <TimelineResizableLayout
      sidebarPanel={TestSideBarPanel}
      mainPanel={MainPanel}
      unifiedFieldListSidebarContainerApi={null}
      container={container}
    />
  );
};

describe('ResizableLayout', () => {
  it('should render without any issues', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('sidebar__panel')).toBeVisible();
    });
  });
});
