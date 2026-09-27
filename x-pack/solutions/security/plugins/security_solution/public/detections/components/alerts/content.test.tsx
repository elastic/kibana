/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../common/mock';
import { AlertsPageContent, SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID } from './content';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { GO_TO_RULES_MENU_ITEM_TEST_ID } from './header/use_alerts_header_menu';
import { ADD_INTEGRATIONS_MENU_ITEM_TEST_ID } from '../../../common/components/app_header/use_add_integrations_menu_item';
import { ML_JOB_SETTINGS_MENU_ITEM_TEST_ID } from '../../../common/components/app_header/use_ml_job_settings_menu_item';
import { DATA_VIEW_PICKER_TEST_ID } from '../../../common/components/search_bar/search_bar_with_data_view_picker';
import { FILTER_BY_ASSIGNEES_BUTTON } from '../../../common/components/filter_by_assignees_popover/test_ids';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../common/components/user_privileges/__mocks__';
import { useLicense } from '../../../common/hooks/use_license';
import { ALERTS_PATH } from '../../../../common/constants';

const renderWithProviders = (children: React.ReactNode) =>
  render(
    <TestProviders>
      <MemoryRouter initialEntries={[ALERTS_PATH]}>{children}</MemoryRouter>
    </TestProviders>
  );

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/hooks/use_license');

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

const dataView: DataView = createStubDataView({ spec: {} });

describe('AlertsPageContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLicense as jest.Mock).mockReturnValue({ isPlatinumPlus: () => true });
    mockUseUserPrivileges.mockReturnValue(
      getUserPrivilegesMockDefaultValue({
        rulesPrivileges: {
          ...getUserPrivilegesMockDefaultValue().rulesPrivileges,
          rules: {
            read: true,
            edit: false,
          },
          exceptions: {
            read: false,
            edit: false,
          },
        },
      })
    );
  });

  it('should render correctly', async () => {
    renderWithProviders(<AlertsPageContent dataView={dataView} />);

    await waitFor(() => {
      expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Alerts');
      expect(screen.getByTestId(DATA_VIEW_PICKER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(FILTER_BY_ASSIGNEES_BUTTON)).toBeInTheDocument();
      expect(screen.getByTestId('chartPanels')).toBeInTheDocument();
    });

    await openAppMenuOverflow();
    expect(screen.getByTestId(GO_TO_RULES_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(ML_JOB_SETTINGS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(ADD_INTEGRATIONS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
  });

  describe('when the user has no rules privileges', () => {
    beforeEach(() => {
      mockUseUserPrivileges.mockReturnValue(
        getUserPrivilegesMockDefaultValue({
          rulesPrivileges: {
            ...getUserPrivilegesMockDefaultValue().rulesPrivileges,
            rules: {
              read: false,
              edit: false,
            },
            exceptions: {
              read: false,
              edit: false,
            },
          },
        })
      );
    });

    it('renders the page content without the Go to Rules button', async () => {
      renderWithProviders(<AlertsPageContent dataView={dataView} />);

      await waitFor(() => {
        expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Alerts');
        expect(screen.getByTestId(FILTER_BY_ASSIGNEES_BUTTON)).toBeInTheDocument();
        expect(screen.getByTestId('chartPanels')).toBeInTheDocument();
      });

      await openAppMenuOverflow();
      expect(screen.queryByTestId(GO_TO_RULES_MENU_ITEM_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
