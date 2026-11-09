/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { RuleDetailsStickyHeader } from './rule_details_sticky_header';

const expectedTop = (kqlBarHeight: number) =>
  new RegExp(
    `^calc\\(\\s*var\\(--kbnAppHeadersOffset,\\s*var\\(--euiFixedHeadersOffset,\\s*0px\\)\\)\\s*\\+\\s*${kqlBarHeight}px\\s*\\+\\s*24px\\s*\\)$`
  );

describe('RuleDetailsStickyHeader', () => {
  const observe = jest.fn();
  const disconnect = jest.fn();

  beforeEach(() => {
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe,
      disconnect,
      unobserve: jest.fn(),
    }));
  });

  afterEach(() => {
    document.getElementById('securitySolutionStickyKQL')?.remove();
    jest.clearAllMocks();
  });

  const renderHeader = () =>
    render(
      <RuleDetailsStickyHeader>
        <div>{'header'}</div>
      </RuleDetailsStickyHeader>
    );

  it('pins its content to the top while the page scrolls', () => {
    renderHeader();

    const container = screen.getByTestId('ruleDetailsStickyHeader');
    expect(container).toHaveStyleRule('position', 'sticky');
    expect(container).toHaveStyleRule('top', expectedTop(0));
  });

  it('pins below the global KQL bar when it is rendered', () => {
    const kqlBar = document.createElement('div');
    kqlBar.id = 'securitySolutionStickyKQL';
    Object.defineProperty(kqlBar, 'offsetHeight', { value: 48 });
    document.body.appendChild(kqlBar);

    renderHeader();

    expect(screen.getByTestId('ruleDetailsStickyHeader')).toHaveStyleRule('top', expectedTop(48));
    expect(observe).toHaveBeenCalledWith(kqlBar);
  });

  it('stays below the full screen data grid, which uses the header level minus 2', () => {
    const { result } = renderHook(() => useEuiTheme());
    const fullScreenDataGridLevel = Number(result.current.euiTheme.levels.header) - 2;

    renderHeader();

    expect(screen.getByTestId('ruleDetailsStickyHeader')).toHaveStyleRule(
      'z-index',
      String(fullScreenDataGridLevel - 1)
    );
  });
});
