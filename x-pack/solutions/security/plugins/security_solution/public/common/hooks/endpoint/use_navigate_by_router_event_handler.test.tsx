/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render as reactRender, act, fireEvent, cleanup } from '@testing-library/react';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useNavigateByRouterEventHandler } from './use_navigate_by_router_event_handler';

type ClickHandlerMock<Return = void> = jest.Mock<
  Return,
  [React.MouseEvent<HTMLAnchorElement, MouseEvent>]
>;

describe('useNavigateByRouterEventHandler hook', () => {
  let history: MemoryHistory;
  let renderResult: RenderResult;
  let linkEle: HTMLAnchorElement;
  let clickHandlerSpy: ClickHandlerMock;
  // eslint-disable-next-line react/display-name
  const Link = React.memo<{
    routeTo: Parameters<typeof useNavigateByRouterEventHandler>[0];
    onClick?: Parameters<typeof useNavigateByRouterEventHandler>[1];
  }>(({ routeTo, onClick }) => {
    const onClickHandler = useNavigateByRouterEventHandler(routeTo, onClick);
    return (
      <a href="/mock/path" onClick={onClickHandler}>
        {'mock link'}
      </a>
    );
  });

  beforeEach(() => {
    history = createMemoryHistory();
    clickHandlerSpy = jest.fn();
    renderResult = reactRender(<Link routeTo="/mock/path" onClick={clickHandlerSpy} />, {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <Router history={history}>{children}</Router>
      ),
    });
    linkEle = renderResult.getByText('mock link') as HTMLAnchorElement;
  });
  afterEach(cleanup);

  it('should navigate to path via Router', () => {
    const containerClickSpy = jest.fn();
    renderResult.container.addEventListener('click', containerClickSpy);
    expect(history.location.pathname).not.toEqual('/mock/path');
    act(() => {
      fireEvent.click(linkEle);
    });
    expect(containerClickSpy.mock.calls[0][0].defaultPrevented).toBe(true);
    expect(history.location.pathname).toEqual('/mock/path');
    renderResult.container.removeEventListener('click', containerClickSpy);
  });
  it('should support onClick prop', () => {
    act(() => {
      fireEvent.click(linkEle);
    });
    expect(clickHandlerSpy).toHaveBeenCalled();
    expect(history.location.pathname).toEqual('/mock/path');
  });
  it('should not navigate if preventDefault is true', () => {
    clickHandlerSpy.mockImplementation((event) => {
      event.preventDefault();
    });
    act(() => {
      fireEvent.click(linkEle);
    });
    expect(history.location.pathname).not.toEqual('/mock/path');
  });
  it('should not navigate via router if click was not the primary mouse button', async () => {
    act(() => {
      fireEvent.click(linkEle, { button: 2 });
    });
    expect(history.location.pathname).not.toEqual('/mock/path');
  });
  it('should not navigate via router if anchor has target', () => {
    linkEle.setAttribute('target', '_top');
    act(() => {
      fireEvent.click(linkEle, { button: 2 });
    });
    expect(history.location.pathname).not.toEqual('/mock/path');
  });
  it('should not to navigate if meta|alt|ctrl|shift keys are pressed', () => {
    ['meta', 'alt', 'ctrl', 'shift'].forEach((key) => {
      act(() => {
        fireEvent.click(linkEle, { [`${key}Key`]: true });
      });
      expect(history.location.pathname).not.toEqual('/mock/path');
    });
  });
});
