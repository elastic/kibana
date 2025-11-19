/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock/test_providers';
import { MigrationRuleDetailsFlyout } from '.';
import { getRuleMigrationRuleMock } from '../../../../../common/siem_migrations/model/__mocks__';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const getMockUser = () => ({
  uid: 'user-1',
  enabled: true,
  user: {
    username: 'test_username',
    full_name: 'Test User',
  },
  data: {},
});

describe('MigrationRuleDetailsFlyout', () => {
  const closeFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [getMockUser()],
    });
  });

  it('renders the flyout with the rule title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );
    expect(getByTestId('detailsFlyoutTitle')).toBeInTheDocument();
    expect(getByTestId('detailsFlyoutTitle')).toHaveTextContent(
      'Access - Excessive Failed Logins - Rule'
    );
  });

  it('renders the flyout with the rule "updated by" information', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );
    expect(getByTestId('updated_at')).toBeInTheDocument();
    expect(getByTestId('updated_at')).toHaveTextContent(
      'Last updated: Test User on Sep 24, 2025 @ 11:36:38.089'
    );
  });

  it('calls closeFlyout when the close button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('detailsFlyoutCloseButton'));
    expect(closeFlyout).toHaveBeenCalled();
  });

  it('renders translation tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );

    expect(getByTestId('tabTranslation')).toBeInTheDocument();
  });

  it('renders overview tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );

    expect(getByTestId('tabOverview')).toBeInTheDocument();
  });

  it('renders summary tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );

    expect(getByTestId('tabSummary')).toBeInTheDocument();
  });

  it('renders close button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
        />
      </TestProviders>
    );

    expect(getByTestId('detailsFlyoutCloseButton')).toBeInTheDocument();
    expect(getByTestId('detailsFlyoutCloseButton')).toHaveTextContent('Close');
  });
});
