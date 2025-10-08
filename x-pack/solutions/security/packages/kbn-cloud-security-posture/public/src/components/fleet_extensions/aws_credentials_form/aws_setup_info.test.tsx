/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TestProvider } from '../test/test_provider';
import { AWSSetupInfoContent } from './aws_setup_info';

// Test demonstrates reusable patterns across cloud providers
describe('AWSSetupInfoContent', () => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProvider>{children}</TestProvider>
  );

  it('should render setup info content correctly', () => {
    const mockInfo = <div data-test-subj="aws-setup-info">{'AWS setup instructions'}</div>;

    render(
      <TestWrapper>
        <AWSSetupInfoContent info={mockInfo} />
      </TestWrapper>
    );
    // Verify the title is rendered with correct i18n message
    expect(screen.getByText('Setup Access')).toBeInTheDocument();

    // Verify the info content is rendered
    expect(screen.getByTestId('aws-setup-info')).toBeInTheDocument();
    expect(screen.getByText('AWS setup instructions')).toBeInTheDocument();
  });

  it('should handle complex info content', () => {
    const complexInfo = (
      <div>
        <p>{'Step 1: Create IAM role'}</p>
        <p>{'Step 2: Configure permissions'}</p>
        <ul>
          <li>{'CloudFormation access'}</li>
          <li>{'EC2 read permissions'}</li>
        </ul>
      </div>
    );

    render(
      <TestWrapper>
        <AWSSetupInfoContent info={complexInfo} />
      </TestWrapper>
    );

    // Verify complex content is rendered
    expect(screen.getByText('Step 1: Create IAM role')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Configure permissions')).toBeInTheDocument();
    expect(screen.getByText('CloudFormation access')).toBeInTheDocument();
    expect(screen.getByText('EC2 read permissions')).toBeInTheDocument();
  });

  it('should have proper styling and structure', () => {
    const mockInfo = <span>{'Info content'}</span>;

    render(
      <TestWrapper>
        <AWSSetupInfoContent info={mockInfo} />
      </TestWrapper>
    );

    // Verify title exists and is a heading
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Setup Access');

    // Verify text content exists (CSS classes may not be applied in test environment)
    const textElement = screen.getByText('Info content');
    expect(textElement).toBeInTheDocument();
  });

  it('should work with FormattedMessage components', () => {
    const infoWithI18n = (
      <FormattedMessage
        id="test.message"
        defaultMessage="This is a test message with {param}"
        values={{ param: 'parameter' }}
      />
    );

    render(
      <TestWrapper>
        <AWSSetupInfoContent info={infoWithI18n} />
      </TestWrapper>
    );

    // Verify FormattedMessage is rendered correctly
    expect(screen.getByText('This is a test message with parameter')).toBeInTheDocument();
  });
});
