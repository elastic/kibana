/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaStyledComponentsThemeProvider } from '@kbn/react-kibana-context-styled';

import { UpdatedBy } from './updated_info';
import { createKibanaContextProviderMock } from '../../../../../../common/lib/kibana/kibana_react.mock';

const MockKibanaContextProvider = createKibanaContextProviderMock();

/**
 * `UpdatedBy` consumes only these four contexts, and unlike `TestProviders` this builds no redux
 * store or query client per render, which the per-test budget cannot afford on a contended CI worker.
 */
const UpdatedInfoTestProviders = ({ children }: PropsWithChildren<{}>) => (
  <MockKibanaContextProvider>
    <I18nProvider>
      <KibanaStyledComponentsThemeProvider>
        <EuiProvider highContrastMode={false}>{children}</EuiProvider>
      </KibanaStyledComponentsThemeProvider>
    </I18nProvider>
  </MockKibanaContextProvider>
);

const renderComponent = (
  updatedBy = 'test',
  updatedAt = new Date().toISOString(),
  dataTestId = 'testComponent'
) => {
  render(
    <UpdatedInfoTestProviders>
      {<UpdatedBy updatedBy={updatedBy} updatedAt={updatedAt} data-test-subj={dataTestId} />}
    </UpdatedInfoTestProviders>
  );
};

describe('UpdatedBy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component', () => {
    renderComponent();

    expect(screen.getByTestId('testComponent')).toBeInTheDocument();
  });

  it('should render updated by message', () => {
    renderComponent('elastic', '2025-04-17T11:54:13.531Z', 'updatedByContainer');

    expect(screen.getByTestId('updatedByContainer')).toHaveTextContent(
      'Updated by: elastic on Apr 17, 2025 @ 11:54:13.531'
    );
  });
});
