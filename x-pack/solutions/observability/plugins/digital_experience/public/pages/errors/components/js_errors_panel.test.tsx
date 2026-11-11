/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { JsErrorGroup } from '../../../../common/types/errors';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { JsErrorsPanel } from './js_errors_panel';

jest.mock('../../../hooks/use_kibana_services');

const ERRORS: JsErrorGroup[] = [
  {
    type: 'TypeError',
    stacktrace: 'TypeError: x is undefined\n    at app.js:1:1',
    message: 'x is undefined',
    count: 2,
    lastSeen: '2021-01-18T12:30:00.000Z',
  },
  {
    type: 'RangeError',
    stacktrace: null,
    message: 'too deep',
    count: 1,
    lastSeen: null,
  },
];

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nProvider>
      <EuiProvider>{children}</EuiProvider>
    </I18nProvider>
  );
};

const renderPanel = (
  errors = ERRORS,
  isLoading = false,
  compact: { maxRows?: number; viewAllHref?: string } = {}
) => {
  return render(<JsErrorsPanel errors={errors} isLoading={isLoading} {...compact} />, {
    wrapper: Wrapper,
  });
};

const openError = (type: string) => {
  return fireEvent.click(screen.getByRole('button', { name: type }));
};

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('JsErrorsPanel', () => {
  it('shows a row per error group with its type, message and occurrences', () => {
    renderPanel();

    expect(screen.getByRole('heading', { level: 2, name: 'JS errors' })).toBeInTheDocument();
    expect(screen.getAllByTestId('digitalExperienceError')).toHaveLength(2);
    expect(screen.getByText('x is undefined')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens the stack trace of an error group in a flyout', () => {
    renderPanel();

    openError('TypeError');

    expect(screen.getByTestId('digitalExperienceErrorFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceErrorStacktrace')).toHaveTextContent(
      'at app.js:1:1'
    );
  });

  it('shows the current counts of the open group and closes when a new response lacks it', () => {
    const panel = (errors: JsErrorGroup[], isLoading = false) => {
      return <JsErrorsPanel errors={errors} isLoading={isLoading} />;
    };
    const flyout = () => {
      return screen.queryByTestId('digitalExperienceErrorFlyout');
    };
    const { rerender } = render(panel(ERRORS), { wrapper: Wrapper });
    openError('TypeError');

    rerender(panel([{ ...ERRORS[0], count: 7 }]));
    expect(flyout()).toHaveTextContent('7');

    rerender(panel([], true));
    rerender(panel(ERRORS));
    expect(flyout()).toBeInTheDocument();
    rerender(panel([ERRORS[1]]));
    expect(flyout()).not.toBeInTheDocument();

    rerender(panel(ERRORS));
    expect(flyout()).not.toBeInTheDocument();
  });

  it('pages through the groups and says when less frequent ones were left out', () => {
    const groups = Array.from({ length: 12 }, (_, index) => {
      return { ...ERRORS[0], type: `Error${index}`, count: 12 - index };
    });
    render(<JsErrorsPanel errors={groups} hasMoreErrors isLoading={false} />, { wrapper: Wrapper });

    expect(screen.getAllByTestId('digitalExperienceError')).toHaveLength(10);
    expect(screen.getByText(/The 100 most frequent groups/)).toBeInTheDocument();
  });

  it('says so when an error group has no stack trace', () => {
    renderPanel();

    openError('RangeError');

    expect(screen.getByText('These errors have no stack trace')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceErrorStacktrace')).not.toBeInTheDocument();
  });

  it('names a group without a type', () => {
    renderPanel([{ ...ERRORS[0], type: null }]);

    expect(screen.getByTestId('digitalExperienceError')).toHaveTextContent('Unknown error type');
  });

  it('lists only the first groups and links to all of them when compact', () => {
    renderPanel(ERRORS, false, { maxRows: 1, viewAllHref: '/errors' });

    expect(screen.getByRole('heading', { level: 2, name: 'Top JS errors' })).toBeInTheDocument();
    expect(screen.getAllByTestId('digitalExperienceError')).toHaveLength(1);
    expect(screen.getByTestId('digitalExperienceErrorsViewAll')).toHaveAttribute('href', '/errors');
  });

  it('shows a spinner while loading', () => {
    renderPanel(ERRORS, true);

    expect(screen.getByTestId('digitalExperienceErrorsPanelLoading')).toBeInTheDocument();
  });

  it('shows the empty state without errors', () => {
    renderPanel([]);

    expect(screen.getByTestId('digitalExperienceErrorsPanelEmpty')).toBeInTheDocument();
    // No errors is good news, not missing instrumentation.
    expect(screen.queryByTestId('digitalExperienceErrorsPanelDocsLink')).not.toBeInTheDocument();
  });
});
