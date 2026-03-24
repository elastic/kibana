/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AWSSetupInfoContent } from './aws_setup_info';

describe('AWSSetupInfoContent', () => {
  const renderComponent = (info: React.ReactNode) =>
    render(
      <I18nProvider>
        <AWSSetupInfoContent info={info} />
      </I18nProvider>
    );

  it('renders setup access title and provided info content', () => {
    const mockInfo = <div data-test-subj="aws-setup-info">{'AWS setup instructions'}</div>;
    renderComponent(mockInfo);

    // Verify title and structure
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent('Setup Access');

    // Verify info content renders correctly
    expect(screen.getByTestId('aws-setup-info')).toBeInTheDocument();
    expect(screen.getByText('AWS setup instructions')).toBeInTheDocument();
  });
});
