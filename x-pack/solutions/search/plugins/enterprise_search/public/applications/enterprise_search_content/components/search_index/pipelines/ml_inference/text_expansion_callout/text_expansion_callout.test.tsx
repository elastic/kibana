/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { setMockActions, setMockValues } from '../../../../../../__mocks__/kea_logic';

vi.mock('./text_expansion_callout_data', () => {
  const mocked = {
    useTextExpansionCallOutData: vi.fn(() => ({
      dismiss: vi.fn(),
      isCreateButtonDisabled: false,
      isDismissable: false,
      isStartButtonDisabled: false,
      show: true,
    })),
  };
  return { ...mocked, default: mocked };
});

import React from 'react';

import { screen } from '@testing-library/react';

import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { TextExpansionCallOut } from './text_expansion_callout';

const DEFAULT_VALUES = {
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelStarted: false,
  isStartButtonDisabled: false,
};

describe('TextExpansionCallOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions({
      createTextExpansionModel: vi.fn(),
      startTextExpansionModel: vi.fn(),
    });
  });
  it('renders error panel instead of normal panel if there are some errors', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      textExpansionError: {
        title: 'Error with ELSER deployment',
        message: 'Mocked error message',
      },
    });
    renderWithKibanaRenderContext(<TextExpansionCallOut />);
    expect(screen.getByText('Error with ELSER deployment')).toBeInTheDocument();
    expect(screen.queryByText('Improve your results with ELSER')).not.toBeInTheDocument();
  });
  it('renders panel with deployment instructions if the model is not deployed', () => {
    renderWithKibanaRenderContext(<TextExpansionCallOut />);
    expect(screen.getByText('Improve your results with ELSER')).toBeInTheDocument();
  });
  it('renders panel with deployment in progress status if the model is being deployed', () => {
    setMockValues({ ...DEFAULT_VALUES, isModelDownloadInProgress: true });
    renderWithKibanaRenderContext(<TextExpansionCallOut />);
    expect(screen.getByText('Your ELSER model is deploying.')).toBeInTheDocument();
  });
  it('renders panel with deployment in progress status if the model has been deployed', () => {
    setMockValues({ ...DEFAULT_VALUES, isModelDownloaded: true });
    renderWithKibanaRenderContext(<TextExpansionCallOut />);
    expect(screen.getByText('Your ELSER model has deployed but not started.')).toBeInTheDocument();
  });
  it('renders panel with deployment in progress status if the model has been started', () => {
    setMockValues({ ...DEFAULT_VALUES, isModelStarted: true });
    renderWithKibanaRenderContext(<TextExpansionCallOut />);
    expect(screen.getByText('Your ELSER model has started.')).toBeInTheDocument();
  });
});
