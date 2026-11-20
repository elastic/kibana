/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { getPendingConsoleRequest$, openPageConsole } from '../console_usage';
import { AnalyticsPageTemplate } from './analytics_page_template';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

describe('AnalyticsPageTemplate', () => {
  let isConsoleReady: boolean;
  const openEmbeddedConsole = jest.fn();
  const consolePlugin = {
    EmbeddableConsole: () => <div data-test-subj="consoleStub" />,
    isEmbeddedConsoleAvailable: () => isConsoleReady,
    openEmbeddedConsole,
  };

  const renderTemplate = (hideConsoleUntilUsed?: boolean) =>
    render(
      <AnalyticsPageTemplate
        breadcrumb="Home"
        data-test-subj="page"
        hideConsoleUntilUsed={hideConsoleUntilUsed}
      >
        <div />
      </AnalyticsPageTemplate>
    );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    isConsoleReady = false;
    getPendingConsoleRequest$().next(undefined);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        chrome: { docTitle: { change: jest.fn() } },
        console: consolePlugin,
        history: {},
      },
    });
  });

  afterEach(() => jest.useRealTimers());

  it('mounts the embedded Console by default', () => {
    renderTemplate();

    expect(screen.getByTestId('consoleStub')).toBeInTheDocument();
  });

  it('leaves the Console off the page until a request opens it, then opens it when it has loaded', () => {
    renderTemplate(true);
    expect(screen.queryByTestId('consoleStub')).not.toBeInTheDocument();

    act(() => {
      expect(openPageConsole(consolePlugin, 'GET _search')).toBe(true);
    });
    expect(screen.getByTestId('consoleStub')).toBeInTheDocument();
    expect(openEmbeddedConsole).not.toHaveBeenCalled();

    isConsoleReady = true;
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(openEmbeddedConsole).toHaveBeenCalledTimes(1);
    expect(openEmbeddedConsole).toHaveBeenCalledWith('GET _search');
    expect(screen.getByTestId('consoleStub')).toBeInTheDocument();
  });

  it('opens a mounted Console directly', () => {
    isConsoleReady = true;

    expect(openPageConsole(consolePlugin, 'GET _search')).toBe(true);

    expect(openEmbeddedConsole).toHaveBeenCalledWith('GET _search');
    expect(getPendingConsoleRequest$().getValue()).toBeUndefined();
  });

  it('reports that there is no Console to open without the component', () => {
    expect(openPageConsole({ ...consolePlugin, EmbeddableConsole: undefined }, 'GET _search')).toBe(
      false
    );
  });
});
