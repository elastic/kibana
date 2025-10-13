/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SummaryTab } from '.';
import { MigrationTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import { getDashboardMigrationDashboardMock } from '../../../../../../../common/siem_migrations/model/__mocks__';
import { useKibana } from '../../../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { useBulkGetUserProfiles } from '../../../../../../common/components/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const getMockUser = () => ({
  uid: 'user-1',
  enabled: true,
  user: {
    username: 'test_username',
    full_name: 'Test User',
  },
  data: {},
});

describe('SummaryTab', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
      },
    });

    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [getMockUser()],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the comments', () => {
    const { getByText } = render(
      <SummaryTab migrationDashboard={getDashboardMigrationDashboardMock()} />
    );
    expect(getByText('Panel "Total Searches Prefiltered (Last Hour)"')).toBeInTheDocument();
  });

  it('renders translated event details for fully translated dashboards', () => {
    const { getAllByText } = render(
      <SummaryTab
        migrationDashboard={getDashboardMigrationDashboardMock({
          translation_result: MigrationTranslationResult.FULL,
        })}
      />
    );
    expect(getAllByText('created a final translation')[0]).toBeInTheDocument();
  });

  it('renders translated event details for partially translated dashboards', () => {
    const { getAllByText } = render(
      <SummaryTab
        migrationDashboard={getDashboardMigrationDashboardMock({
          translation_result: MigrationTranslationResult.PARTIAL,
        })}
      />
    );
    expect(getAllByText('created a final translation')[0]).toBeInTheDocument();
  });

  it('renders not translated event details for untranslatable dashboards', () => {
    const { getAllByText } = render(
      <SummaryTab
        migrationDashboard={getDashboardMigrationDashboardMock({
          translation_result: MigrationTranslationResult.UNTRANSLATABLE,
        })}
      />
    );
    expect(getAllByText('failed to translate')[0]).toBeInTheDocument();
  });
});
