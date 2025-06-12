/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { Sidebar } from './sidebar';
import { useKibana } from '../../../common/lib/kibana';
import type { CaseUiClientMock } from '@kbn/cases-plugin/public/mocks';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { noCasesPermissions, readCasesPermissions } from '../../../cases_test_utils';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/user_privileges');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

describe('Sidebar', () => {
  let casesMock: CaseUiClientMock;

  beforeEach(() => {
    casesMock = casesPluginMock.createStartContract();
    casesMock.ui.getRecentCases.mockImplementation(() => <>{'test'}</>);
    useKibanaMock.mockReturnValue({
      services: {
        cases: casesMock,
        application: {
          // these are needed by the RecentCases component if it is rendered.
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(() => ''),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });
  });

  it('does not render the recently created cases section when the user does not have read permissions', async () => {
    casesMock.helpers.canUseCases.mockReturnValue(noCasesPermissions());

    render(
      <TestProviders>
        <Sidebar recentTimelinesFilterBy={'favorites'} setRecentTimelinesFilterBy={() => {}} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(casesMock.ui.getRecentCases).not.toHaveBeenCalled();
    });
  });

  it('does render the recently created cases section when the user has read permissions', async () => {
    casesMock.helpers.canUseCases.mockReturnValue(readCasesPermissions());

    render(
      <TestProviders>
        <Sidebar recentTimelinesFilterBy={'favorites'} setRecentTimelinesFilterBy={() => {}} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(casesMock.ui.getRecentCases).toHaveBeenCalled();
    });
  });

  it('does not render recent timelines for users with insufficient privileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: {},
    });

    render(
      <TestProviders>
        <Sidebar recentTimelinesFilterBy={'favorites'} setRecentTimelinesFilterBy={() => {}} />
      </TestProviders>
    );

    expect(screen.queryByTestId('recent-timelines-container')).not.toBeInTheDocument();
  });

  it('does render recent timelines for users with sufficient privileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });

    render(
      <TestProviders>
        <Sidebar recentTimelinesFilterBy={'favorites'} setRecentTimelinesFilterBy={() => {}} />
      </TestProviders>
    );

    expect(screen.queryByTestId('recent-timelines-container')).toBeInTheDocument();
  });
});
