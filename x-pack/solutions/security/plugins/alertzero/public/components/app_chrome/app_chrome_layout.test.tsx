/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { EuiProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { of } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { AppChromeLayout } from './app_chrome_layout';

const coreStartStub = {
  docLinks: { links: { securitySolution: { guide: 'https://www.elastic.co/guide' } } },
} as unknown as CoreStart;

const makeChromeWithFeedback = (openFeedback?: () => void) => {
  const chrome = chromeServiceMock.createStartContract();
  (chrome.help.getFeedbackHandler$ as unknown as jest.Mock) = jest.fn(() => of(openFeedback));
  return chrome as never;
};

/**
 * `AppHeaderView` reads the Chrome service via context (basePath, back-nav, feedback handler),
 * so the mock start contract must wrap the tree like core's provider does.
 */
const renderLayout = async (chrome: never, expectOverflow = true) => {
  const utils = render(
    <KibanaContextProvider services={coreStartStub}>
      <MockChromeContextProvider chrome={chrome}>
        <EuiProvider>
          <Router history={createMemoryHistory({ initialEntries: ['/'] })}>
            <AppChromeLayout>content</AppChromeLayout>
          </Router>
        </EuiProvider>
      </MockChromeContextProvider>
    </KibanaContextProvider>
  );
  // `AppMenuComponent` is lazily loaded; the overflow button only mounts once the chunk
  // resolves, so click it only when (and after) it shows up.
  if (expectOverflow) {
    const overflow = await waitFor(() => {
      const el = (
        utils.container.querySelector('[data-euiicon-type="ellipsis"]') as HTMLElement
      )?.closest('button');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    fireEvent.click(overflow);
  }
  return utils;
};

describe('AppChromeLayout header menu', () => {
  it('renders Documentation and Feedback items when a feedback handler is registered', async () => {
    await renderLayout(makeChromeWithFeedback(jest.fn()));

    expect(await screen.findByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  it('invokes the feedback handler when Feedback is clicked', async () => {
    const openFeedback = jest.fn();
    await renderLayout(makeChromeWithFeedback(openFeedback));

    fireEvent.click(await screen.findByText('Feedback'));
    expect(openFeedback).toHaveBeenCalledTimes(1);
  });

  it('links Documentation to the Security solution guide', async () => {
    await renderLayout(makeChromeWithFeedback(jest.fn()));

    const link = (await screen.findByText('Documentation')).closest('a');
    expect(link?.getAttribute('href')).toBe('https://www.elastic.co/guide');
  });

  it('shows no Feedback entry when no feedback handler is registered', async () => {
    const utils = await renderLayout(makeChromeWithFeedback(undefined));
    // The overflow button may still render (Documentation is app-owned); opening it must
    // not offer a Feedback action.
    expect(utils.container.querySelector('[data-euiicon-type="ellipsis"]')).toBeTruthy();
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument();
    expect(await screen.findByText('Documentation')).toBeInTheDocument();
  });
});
