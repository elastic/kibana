/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import type {
  ExpandableFlyoutApi,
  ExpandableFlyoutState,
  FlyoutPanelHistory,
} from '@kbn/expandable-flyout';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';
import type { GenericEntityPanelProps } from '.';
import { GenericEntityPanel } from '.';
import { useGetGenericEntity } from './hooks/use_get_generic_entity';
import { useGenericEntityCriticality } from './hooks/use_generic_entity_criticality';

const mockProps: GenericEntityPanelProps = {
  entityDocId: 'entity_doc_id_test',
  scopeId: 'scope_id_test',
};

const defaultEntityData = {
  _id: '1',
  _source: {
    entity: { id: 'entity-123-test' },
  },
};

jest.mock('./hooks/use_get_generic_entity', () => ({
  useGetGenericEntity: jest.fn(), // ✅ return a Jest mock function
}));

const mockUseGetGenericEntity = useGetGenericEntity as jest.Mock;

jest.mock('./hooks/use_generic_entity_criticality', () => ({
  useGenericEntityCriticality: jest.fn(), // ✅ return a Jest mock function
}));

const mockUseGenericEntityCriticality = useGenericEntityCriticality as jest.Mock;

const flyoutContextValue = {
  closeLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const flyoutHistory: FlyoutPanelHistory[] = [
  { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
];
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
}));

describe('HostPanel', () => {
  beforeEach(() => {
    mockUseGetGenericEntity.mockReturnValue({
      getGenericEntity: {
        isLoading: false,
        isError: false,
        data: defaultEntityData,
      },
    });
    mockUseGenericEntityCriticality.mockReturnValue({
      getAssetCriticality: {
        isLoading: false,
        isError: false,
      },
      assignAssetCriticality: {
        isError: false,
      },
    });
    jest.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('renders generic flyout', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GenericEntityPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('generic-panel-header')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseGetGenericEntity.mockReturnValue({
      getGenericEntity: {
        isLoading: true,
        isError: false,
        data: defaultEntityData,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <GenericEntityPanel {...mockProps} />
      </TestProviders>
    );
    expect(queryByTestId('generic-flyout-loading')).toBeInTheDocument();
  });

  it('renders loading state when get generic asset criticality is still loading', () => {
    mockUseGenericEntityCriticality.mockReturnValue({
      getAssetCriticality: {
        isLoading: true,
        isError: false,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <GenericEntityPanel {...mockProps} />
      </TestProviders>
    );
    expect(queryByTestId('generic-flyout-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseGetGenericEntity.mockReturnValue({
      getGenericEntity: {
        isLoading: false,
        isError: true,
        data: defaultEntityData,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <GenericEntityPanel {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('generic-right-flyout-error-prompt')).toBeInTheDocument();
  });

  it('renders error state, empty data ', () => {
    mockUseGetGenericEntity.mockReturnValue({
      getGenericEntity: {
        isLoading: false,
        isError: false,
        data: undefined,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <GenericEntityPanel {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('generic-right-flyout-error-prompt')).toBeInTheDocument();
  });
});
