/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import { TestProviders } from '../../../common/mock';
import { AttacksPageContent, SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID } from './content';

const dataView: DataView = createStubDataView({ spec: {} });
const dataViewSpec: DataViewSpec = createStubDataView({ spec: {} }).toSpec();

describe('AttacksPageContent', () => {
  it('should render correctly', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} oldSourcererDataViewSpec={dataViewSpec} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('header-page-title')).toHaveTextContent('Attacks');
    });
  });
});
