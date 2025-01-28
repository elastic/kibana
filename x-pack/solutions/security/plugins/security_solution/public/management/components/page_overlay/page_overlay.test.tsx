/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { PageOverlayProps } from './page_overlay';
import {
  PAGE_OVERLAY_DOCUMENT_BODY_FULLSCREEN_CLASSNAME,
  PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME,
  PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME,
  PageOverlay,
} from './page_overlay';
import { act, waitFor } from '@testing-library/react';

describe('When using PageOverlay component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let reRender: () => ReturnType<AppContextTestRender['render']>;
  let renderProps: jest.Mocked<PageOverlayProps>;
  let historyMock: AppContextTestRender['history'];

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    historyMock = appTestContext.history;

    renderProps = {
      children: <div data-test-subj="test-body">{'page content here'}</div>,
      onHide: jest.fn(),
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(<PageOverlay {...renderProps} />);
      return renderResult;
    };

    reRender = () => {
      renderResult.rerender(<PageOverlay {...renderProps} />);
      return renderResult;
    };

    historyMock.push('/foo');
  });

  it('should display the overlay using minimal props', () => {
    render();

    const overlay = renderResult.getByTestId('test');

    expect(overlay.textContent).toEqual('page content here');
    expect(overlay.classList.contains('eui-scrollBar')).toBe(true);
    expect(overlay.classList.contains('scrolling')).toBe(true);
    expect(overlay.classList.contains('hidden')).toBe(false);
  });

  it('should set classname on `<body>` when visible', () => {
    render();

    const bodyClasslist = window.document.body.classList;

    expect(bodyClasslist.contains(PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME)).toBe(true);
    expect(bodyClasslist.contains(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME)).toBe(true);
    expect(bodyClasslist.contains(PAGE_OVERLAY_DOCUMENT_BODY_FULLSCREEN_CLASSNAME)).toBe(false);
  });

  it('should all browser window scrolling when `lockDocumentBody` is `false`', () => {
    renderProps.lockDocumentBody = false;
    render();

    expect(window.document.body.classList.contains(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME)).toBe(
      false
    );
  });

  it('should remove all classnames from `<body>` when hidden/unmounted', () => {
    renderProps.isHidden = true;
    render();

    const bodyClasslist = window.document.body.classList;

    expect(bodyClasslist.contains(PAGE_OVERLAY_DOCUMENT_BODY_IS_VISIBLE_CLASSNAME)).toBe(false);
    expect(bodyClasslist.contains(PAGE_OVERLAY_DOCUMENT_BODY_LOCK_CLASSNAME)).toBe(false);
  });

  it('should move the overlay to be the last child of `<body>` if `appendAsBodyLastNode` prop is `true`', async () => {
    renderProps.isHidden = true;
    render();

    expect(renderResult.getByTestId('test')).not.toBeVisible();

    const myDiv = document.createElement('div');
    myDiv.classList.add('my-div');
    document.body.appendChild(myDiv);

    expect(document.body.querySelector('[data-euiportal]')!.nextElementSibling).toBe(myDiv);

    renderProps.isHidden = false;
    reRender();

    await waitFor(() => {
      const portalEle = document.body.querySelector('[data-euiportal]')!;

      expect(portalEle.nextElementSibling).toBe(null);
      expect(portalEle.previousElementSibling).toBe(myDiv);
    });
  });

  it('should call `onHide` when `hideOnUrlPathnameChange` is `true` and url changes', () => {
    render();

    expect(renderResult.getByTestId('test')).toBeVisible();

    act(() => {
      historyMock.push('/bar');
    });

    expect(renderProps.onHide).toHaveBeenCalled();
  });

  it('should NOT call `onHide` when `hideOnUrlPathnameChange` is `false` and url changes', () => {
    renderProps.hideOnUrlPathnameChange = false;
    render();

    expect(renderResult.getByTestId('test')).toBeVisible();

    act(() => {
      historyMock.push('/bar');
    });

    expect(renderProps.onHide).not.toHaveBeenCalled();
  });

  it('should disable content scrolling inside of overlay', () => {
    renderProps.enableScrolling = false;
    render();

    const overlay = renderResult.getByTestId('test');

    expect(overlay.classList.contains('eui-scrollBar')).toBe(false);
    expect(overlay.classList.contains('scrolling')).toBe(false);
  });

  it.each`
    size    | className
    ${'xs'} | ${'padding-xs'}
    ${'s'}  | ${'padding-s'}
    ${'m'}  | ${'padding-m'}
    ${'l'}  | ${'padding-l'}
    ${'xl'} | ${'padding-xl'}
  `('should add padding class names when `paddingSize` of $size is used', ({ size, className }) => {
    renderProps.paddingSize = size;
    render();

    expect(renderResult.getByTestId('test')).toHaveClass(className);
  });
});
