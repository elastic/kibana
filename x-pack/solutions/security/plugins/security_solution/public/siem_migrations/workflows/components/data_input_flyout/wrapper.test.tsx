/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { WorkflowMigrationDataInputWrapper } from './wrapper';
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

describe('WorkflowMigrationDataInputWrapper', () => {
  it('should render its children', () => {
    const { getByText } = render(
      <TestProviders>
        <WorkflowMigrationDataInputWrapper onFlyoutClosed={() => {}}>
          <ContextConsumer />
        </WorkflowMigrationDataInputWrapper>
      </TestProviders>
    );

    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('should open the flyout and notify when it is closed', () => {
    const onFlyoutClosed = jest.fn();
    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <WorkflowMigrationDataInputWrapper onFlyoutClosed={onFlyoutClosed}>
          <ContextConsumer />
        </WorkflowMigrationDataInputWrapper>
      </TestProviders>
    );

    expect(queryByTestId('workflowMigrationDataInputFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('testOpenFlyoutButton'));

    expect(getByTestId('workflowMigrationDataInputFlyout')).toBeInTheDocument();

    fireEvent.click(getByTestId('testCloseFlyoutButton'));

    expect(queryByTestId('workflowMigrationDataInputFlyout')).not.toBeInTheDocument();
    expect(onFlyoutClosed).toHaveBeenCalled();
  });
});
