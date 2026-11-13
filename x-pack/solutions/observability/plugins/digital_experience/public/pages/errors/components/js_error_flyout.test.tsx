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
import { JsErrorFlyout } from './js_error_flyout';

jest.mock('../../../hooks/use_kibana_services');

const ERROR: JsErrorGroup = {
  type: 'TypeError',
  stacktrace: 'TypeError: x is undefined\n    at checkout (app.js:10:5)',
  message: 'x is undefined',
  count: 1200,
  lastSeen: '2021-01-18T12:30:00.000Z',
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nProvider>
      <EuiProvider>{children}</EuiProvider>
    </I18nProvider>
  );
};

const renderFlyout = (error: JsErrorGroup = ERROR, onClose = jest.fn()) => {
  render(<JsErrorFlyout error={error} onClose={onClose} />, {
    wrapper: Wrapper,
  });
  return onClose;
};

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('JsErrorFlyout', () => {
  it('names the group and shows its occurrences, last occurrence and stack trace', () => {
    renderFlyout();

    expect(screen.getByTestId('digitalExperienceErrorFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'TypeError' })).toBeInTheDocument();
    expect(screen.getByText('Occurrences')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('Last seen')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceErrorStacktrace')).toHaveTextContent(
      'at checkout (app.js:10:5)'
    );
  });

  it('says so and shows the message when the group has no stack trace', () => {
    renderFlyout({ ...ERROR, stacktrace: null, lastSeen: null });

    expect(screen.getByText('These errors have no stack trace')).toBeInTheDocument();
    expect(screen.getByText('x is undefined')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceErrorStacktrace')).not.toBeInTheDocument();
    expect(screen.queryByText('Last seen')).not.toBeInTheDocument();
  });

  it('names a group without a type', () => {
    renderFlyout({ ...ERROR, type: null });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Unknown error type' })
    ).toBeInTheDocument();
  });

  it('closes', () => {
    const onClose = renderFlyout();

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
