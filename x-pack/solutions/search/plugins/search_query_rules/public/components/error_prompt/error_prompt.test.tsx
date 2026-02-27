/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ErrorPrompt } from './error_prompt';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);
describe('ErrorPrompt', () => {
  it("renders 'notFound' error type", () => {
    const { getByText } = render(<ErrorPrompt errorType="notFound" />, { wrapper: Wrapper });

    expect(getByText('Not found')).toBeInTheDocument();
    expect(
      getByText('Requested resource was not found. Check if the URL is correct.')
    ).toBeInTheDocument();
  });

  it("renders 'generic' error type", () => {
    const { getByText } = render(<ErrorPrompt errorType="generic" />, { wrapper: Wrapper });

    expect(getByText('An error occurred')).toBeInTheDocument();
    expect(
      getByText(
        'An error occurred while fetching query rules. Check Kibana logs for more information.'
      )
    ).toBeInTheDocument();
  });

  it("renders 'missingPermissions' error type", () => {
    const { getByText } = render(<ErrorPrompt errorType="missingPermissions" />, {
      wrapper: Wrapper,
    });

    expect(getByText('Missing permissions')).toBeInTheDocument();
    expect(
      getByText(
        'You do not have the necessary permissions to manage query rules. Contact your system administrator.'
      )
    ).toBeInTheDocument();
  });
});
