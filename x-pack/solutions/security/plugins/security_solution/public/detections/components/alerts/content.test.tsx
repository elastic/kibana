/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import type { AlertFilterControlsProps } from '@kbn/alerts-ui-shared/src/alert_filter_controls/alert_filter_controls';
import { TestProviders } from '../../../common/mock';
import { AlertsPageContent, SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID } from './content';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { GO_TO_RULES_BUTTON_TEST_ID } from './header/header_section';
import { FILTER_BY_ASSIGNEES_BUTTON } from '../../../common/components/filter_by_assignees_popover/test_ids';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { APP_ALERTS_PATH } from '../../../../common/constants';
import { mockHistory } from '../../../common/utils/route/mocks';

jest.mock('@kbn/alerts-ui-shared/src/alert_filter_controls', () => ({
  AlertFilterControls: (props: AlertFilterControlsProps) => (
    <div data-test-subj="alert-filter-controls-test-stub">{props.beforeContextMenu}</div>
  ),
}));

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

const dataView: DataView = createStubDataView({ spec: {} });
const dataViewSpec: DataViewSpec = createStubDataView({ spec: {} }).toSpec();
const runtimeMappings: RunTimeMappings = createStubDataView({
  spec: {},
}).getRuntimeMappings() as RunTimeMappings;

const alertsPageHistoryMock = {
  ...mockHistory,
  location: {
    ...mockHistory.location,
    pathname: APP_ALERTS_PATH,
  },
};

describe('AlertsPageContent', () => {
  it('should render correctly', async () => {
    render(
      <TestProviders>
        <Router history={alertsPageHistoryMock}>
          <AlertsPageContent
            dataView={dataView}
            oldSourcererDataViewSpec={dataViewSpec}
            runtimeMappings={runtimeMappings}
          />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('header-page-title')).toHaveTextContent('Alerts');
      expect(screen.getByTestId(FILTER_BY_ASSIGNEES_BUTTON)).toBeInTheDocument();
      expect(screen.getByTestId(GO_TO_RULES_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('chartPanels')).toBeInTheDocument();
    });
  });
});
