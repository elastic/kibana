/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as utils from './utils';
import {
  UpdateElserMappingsModal,
  type UpdateElserMappingsModalProps,
} from './update_elser_mappings_modal';
import { useUpdateMappings } from '../../hooks/api/use_update_mappings';
import { useKibana } from '../../hooks/use_kibana';
import type { NormalizedFields } from './types';

jest.mock('./utils', () => ({
  deNormalize: jest.fn(),
  prepareFieldsForEisUpdate: jest.fn(),
  isElserOnMlNodeSemanticField: jest.fn(),
}));

jest.mock('../../hooks/api/use_update_mappings');

jest.mock('../../hooks/use_kibana');

jest.mock('../../../common/doc_links', () => ({
  docLinks: {
    elasticInferenceServicePricing: 'http://example.com/docs',
  },
}));

const deNormalizeMock = jest.mocked(utils.deNormalize);
const prepareFieldsForEisUpdateMock = jest.mocked(utils.prepareFieldsForEisUpdate);
const isElserOnMlNodeSemanticFieldMock = jest.mocked(utils.isElserOnMlNodeSemanticField);
const mockUseKibana = useKibana as jest.Mock;
const mockUseUpdateMappings = useUpdateMappings as jest.Mock;

const setIsModalOpen = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn() };
const updateIndexMappings = jest.fn();

const renderUpdateElserMappingsModal = (props?: Partial<UpdateElserMappingsModalProps>) => {
  const mockMappings: NormalizedFields['byId'] = {
    first: {
      id: 'first',
      path: ['name'],
      source: { name: 'name', type: 'semantic_text', inference_id: '.elser-2-elasticsearch' },
      hasChildFields: false,
    },
    second: {
      id: 'second',
      path: ['text'],
      source: { name: 'text', type: 'semantic_text', inference_id: '.elser-2-elasticsearch' },
      hasChildFields: false,
    },
  };

  return render(
    <IntlProvider>
      <UpdateElserMappingsModal
        indexName="test-index"
        setIsModalOpen={setIsModalOpen}
        hasUpdatePrivileges={props?.hasUpdatePrivileges ?? true}
        mappings={props?.mappings ?? mockMappings}
      />
    </IntlProvider>
  );
};

describe('UpdateElserMappingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: mockToasts },
      },
    });

    mockUseUpdateMappings.mockReturnValue({
      updateIndexMappings,
      isLoading: false,
    });

    isElserOnMlNodeSemanticFieldMock.mockImplementation((field) => {
      return field.source.inference_id === '.elser-2-elasticsearch';
    });

    prepareFieldsForEisUpdateMock.mockReturnValue({
      byId: {
        first: {
          id: 'first',
          path: ['name'],
          source: { name: 'name', type: 'semantic_text', inference_id: '.elser-2-elasticsearch' },
          hasChildFields: false,
        },
      },
      aliases: {},
      rootLevelFields: ['first'],
    });

    deNormalizeMock.mockReturnValue({
      name: {
        type: 'semantic_text',
        inference_id: '.elser-2-elastic',
      },
    });
  });

  it('should render modal and load options', () => {
    renderUpdateElserMappingsModal();

    expect(screen.getByTestId('updateElserMappingsModal')).toBeInTheDocument();
    expect(screen.getByTestId('updateElserMappingsSelect')).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'text' })).toBeInTheDocument();

    const badges = screen.getAllByText('.elser-2-elasticsearch');
    expect(badges).toHaveLength(2);
  });

  it('should disable Apply button if no options are checked', () => {
    renderUpdateElserMappingsModal();
    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    expect(applyBtn).toBeDisabled();
  });

  it('should enable Apply button when at least one option is checked', async () => {
    renderUpdateElserMappingsModal();
    const selectable = screen.getByTestId('updateElserMappingsSelect');
    const firstOption = within(selectable).getByRole('option', { name: 'name' });
    await userEvent.click(firstOption);

    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    expect(applyBtn).toBeEnabled();
  });

  it('should disable Apply if hasUpdatePrivileges is false', () => {
    renderUpdateElserMappingsModal({ hasUpdatePrivileges: false });
    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    expect(applyBtn).toBeDisabled();
  });

  it('should call API and close modal on successful Apply', async () => {
    renderUpdateElserMappingsModal();

    const selectable = screen.getByTestId('updateElserMappingsSelect');
    const firstOption = within(selectable).getByRole('option', { name: 'name' });
    await userEvent.click(firstOption);

    updateIndexMappings.mockImplementation((input, callbacks) => {
      callbacks?.onSuccess?.();
    });

    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    await userEvent.click(applyBtn);

    expect(updateIndexMappings).toHaveBeenCalledTimes(1);
    expect(updateIndexMappings).toHaveBeenCalledWith(
      {
        indexName: 'test-index',
        fields: {
          name: {
            type: 'semantic_text',
            inference_id: '.elser-2-elastic',
          },
        },
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
    expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it('should display error message if API fails', async () => {
    renderUpdateElserMappingsModal();

    const selectable = screen.getByTestId('updateElserMappingsSelect');
    const firstOption = within(selectable).getByRole('option', { name: 'name' });
    await userEvent.click(firstOption);

    const mockError = {
      message: 'API request failed',
      body: {
        message: 'Error updating mappings',
        statusCode: 500,
      },
    };

    updateIndexMappings.mockImplementation((input, callbacks) => {
      callbacks?.onError?.(mockError);
    });

    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    await userEvent.click(applyBtn);

    expect(updateIndexMappings).toHaveBeenCalledTimes(1);
    expect(mockToasts.addError).toHaveBeenCalledTimes(1);
  });

  it('should close modal when Cancel button is clicked', async () => {
    renderUpdateElserMappingsModal();
    const cancelBtn = screen.getByTestId('UpdateElserMappingsModalCancelBtn');
    await userEvent.click(cancelBtn);
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });

  it('should show loading state when isLoading is true', () => {
    mockUseUpdateMappings.mockReturnValue({
      updateIndexMappings,
      isLoading: true,
    } as any);

    renderUpdateElserMappingsModal();
    const applyBtn = screen.getByTestId('UpdateElserMappingsModalApplyBtn');
    // EuiButton with isLoading prop adds a loading spinner
    expect(applyBtn.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });
});
