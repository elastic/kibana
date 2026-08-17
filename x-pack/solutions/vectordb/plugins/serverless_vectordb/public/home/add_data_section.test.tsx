/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { VECTORDB_APP_ID } from '@kbn/deeplinks-vectordb';
import { GETTING_STARTED_PATH } from '../../common/constants';
import { useKibana } from '../hooks/use_kibana';
import { AddDataSection } from './add_data_section';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('AddDataSection', () => {
  const navigateToApp = jest.fn();

  // the cards are styled from the theme, so they need a theme in context
  const renderSection = () =>
    render(
      <EuiThemeProvider>
        <AddDataSection />
      </EuiThemeProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { application: { navigateToApp } } });
  });

  it.each([
    ['addDataEmbeddingsLink', VECTORDB_APP_ID, { path: GETTING_STARTED_PATH }],
    ['addDataDevToolsLink', 'dev_tools', undefined],
    ['addDataSampleDataLink', 'home', { path: '#/tutorial_directory/sampleData' }],
    ['addDataUploadFileLink', 'home', { path: '#/tutorial_directory/fileDataViz' }],
  ])('navigates from %s to the %s app', (testSubj, appId, options) => {
    renderSection();

    fireEvent.click(screen.getByTestId(testSubj));

    if (options) {
      expect(navigateToApp).toHaveBeenCalledWith(appId, options);
    } else {
      expect(navigateToApp).toHaveBeenCalledWith(appId);
    }
  });
});
