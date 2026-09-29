/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

vi.mock('./multi_field_selector', () => {
  const mocked = {
    MultiFieldMapping: () => <div data-test-subj="multiFieldMapping" />,
    SelectedFieldMappings: () => <div data-test-subj="selectedFieldMappings" />,
  };
  return { ...mocked, default: mocked };
});

import React from 'react';

import { screen } from '@testing-library/react';

import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { ConfigureFields } from './configure_fields';

describe('ConfigureFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockValues({});
    setMockActions({ makeRequest: vi.fn() });
  });

  const mockValues = {
    isTextExpansionModelSelected: false,
    addInferencePipelineModal: { configuration: { existingPipeline: false } },
  };

  it('renders multi-field selector components', () => {
    setMockValues({
      ...mockValues,
      isTextExpansionModelSelected: true,
    });
    renderWithKibanaRenderContext(<ConfigureFields />);
    expect(screen.getByTestId('multiFieldMapping')).toBeInTheDocument();
    expect(screen.getByTestId('selectedFieldMappings')).toBeInTheDocument();
  });

  it('only renders field mappings in read-only mode', () => {
    setMockValues({
      ...mockValues,
      addInferencePipelineModal: { configuration: { existingPipeline: true } },
    });
    renderWithKibanaRenderContext(<ConfigureFields />);
    expect(screen.queryByTestId('multiFieldMapping')).not.toBeInTheDocument();
    expect(screen.getByTestId('selectedFieldMappings')).toBeInTheDocument();
  });
});
