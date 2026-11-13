/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Chance from 'chance';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { createCloudDefendIntegrationFixture } from '../../test/fixtures/cloud_defend_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { TestProvider } from '../../test/test_provider';
import { Policies } from '.';
import * as TEST_SUBJ from './test_subjects';
import { ADD_INTEGRATIONS_MENU_ITEM_TEST_ID } from '../../components/cloud_defend_app_header/use_add_integrations_menu_item';
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

    const coreStart = coreMock.createStart();
    const core: CoreStart = {
      ...coreStart,
      application: {
        ...coreStart.application,
        capabilities: { ...coreStart.application.capabilities, fleet: { read: true } },
      },
    };

    return render(
      <TestProvider core={core}>
        <Policies />
      </TestProvider>
    );
  };

  it('renders the page header', () => {
    renderPolicies();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Defend for containers (D4C)'
    );
  });

  it('does not render a page-level "Add Integration" action', () => {
    renderPolicies();

    expect(screen.queryByRole('link', { name: 'Add Integration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Integration' })).not.toBeInTheDocument();
  });

  it('renders "Add integrations" in the app menu overflow', async () => {
    renderPolicies();

    await openAppMenuOverflow();

    expect(screen.getByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
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
