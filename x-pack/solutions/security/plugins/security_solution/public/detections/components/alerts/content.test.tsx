/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AlertsPageContent, SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID } from './content';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { GO_TO_RULES_BUTTON_TEST_ID } from './header/header_section';
import { FILTER_BY_ASSIGNEES_BUTTON } from '../../../common/components/filter_by_assignees_popover/test_ids';

const dataView: DataView = createStubDataView({ spec: {} });

describe('AlertsPageContent', () => {
  it('should render correctly', async () => {
    render(
      <TestProviders>
        <AlertsPageContent dataView={dataView} />
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
