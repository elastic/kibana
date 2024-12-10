/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Chance from 'chance';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { createCloudDefendIntegrationFixture } from '../../test/fixtures/cloud_defend_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { TestProvider } from '../../test/test_provider';
import { Policies } from '.';
import * as TEST_SUBJ from './test_subjects';
import { useCloudDefendPolicies } from './use_cloud_defend_policies';
import { useCloudDefendSetupStatusApi } from '../../common/api/use_setup_status_api';
import { useSubscriptionStatus } from '../../common/hooks/use_subscription_status';
import { useCloudDefendIntegrationLinks } from '../../common/navigation/use_cloud_defend_integration_links';

jest.mock('./use_cloud_defend_policies');
jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/hooks/use_subscription_status');
jest.mock('../../common/navigation/use_cloud_defend_integration_links');

const chance = new Chance();

describe('<Policies />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useCloudDefendSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed' },
      })
    );

    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useCloudDefendIntegrationLinks as jest.Mock).mockImplementation(() => ({
      addIntegrationLink: chance.url(),
      docsLink: chance.url(),
    }));
  });

  const renderPolicies = (queryResponse: Partial<UseQueryResult> = createReactQueryResponse()) => {
    (useCloudDefendPolicies as jest.Mock).mockImplementation(() => queryResponse);

    return render(
      <TestProvider>
        <Policies />
      </TestProvider>
    );
  };

  it('renders the page header', () => {
    renderPolicies();

    expect(screen.getByTestId(TEST_SUBJ.POLICIES_PAGE_HEADER)).toBeInTheDocument();
  });

  it('renders the "add integration" button', () => {
    renderPolicies();

    expect(screen.getByTestId(TEST_SUBJ.ADD_INTEGRATION_TEST_SUBJ)).toBeInTheDocument();
  });

  it('renders error state while there is an error', () => {
    const error = new Error('message');
    renderPolicies(createReactQueryResponse({ status: 'error', error }));

    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('renders the policies table', () => {
    renderPolicies(
      createReactQueryResponse({
        status: 'success',
        data: { total: 1, items: [createCloudDefendIntegrationFixture()] },
      })
    );

    expect(screen.getByTestId(TEST_SUBJ.POLICIES_TABLE_DATA_TEST_SUBJ)).toBeInTheDocument();
    Object.values(TEST_SUBJ.POLICIES_TABLE_COLUMNS).forEach((testId) =>
      expect(screen.getAllByTestId(testId)[0]).toBeInTheDocument()
    );
  });
});
