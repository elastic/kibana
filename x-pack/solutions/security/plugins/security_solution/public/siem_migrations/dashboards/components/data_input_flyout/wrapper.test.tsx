/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DashboardMigrationDataInputWrapper } from './wrapper';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useMigrationDataInputContext } from '../../../common/components';

const ContextConsumer = () => {
  const { openFlyout, closeFlyout } = useMigrationDataInputContext();

  return (
    <div>
      <button type="button" data-test-subj="testOpenFlyoutButton" onClick={() => openFlyout()}>
        {'Open'}
      </button>
      <button type="button" data-test-subj="testCloseFlyoutButton" onClick={() => closeFlyout()}>
        {'Close'}
      </button>
      <div>{'Test Content'}</div>
    </div>
  );
};

describe('DashboardMigrationDataInputWrapper', () => {
  it('renders children', () => {
    const { getByText } = render(
      <TestProviders>
        <DashboardMigrationDataInputWrapper onFlyoutClosed={() => {}}>
          <ContextConsumer />
        </DashboardMigrationDataInputWrapper>
      </TestProviders>
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('opens and closes the flyout', () => {
    const onFlyoutClosed = jest.fn();
    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputWrapper onFlyoutClosed={onFlyoutClosed}>
          <ContextConsumer />
        </DashboardMigrationDataInputWrapper>
      </TestProviders>
    );

    expect(queryByTestId('dashboardMigrationDataInputFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('testOpenFlyoutButton'));

    expect(getByTestId('dashboardMigrationDataInputFlyout')).toBeInTheDocument();

    fireEvent.click(getByTestId('testCloseFlyoutButton'));

    expect(queryByTestId('dashboardMigrationDataInputFlyout')).not.toBeInTheDocument();
    expect(onFlyoutClosed).toHaveBeenCalled();
  });
});
