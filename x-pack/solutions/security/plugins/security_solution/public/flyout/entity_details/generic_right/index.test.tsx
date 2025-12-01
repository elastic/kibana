/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
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
import {
  GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ,
  GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ,
} from './constants';

const mockProps: GenericEntityPanelProps = {
  entityDocId: 'entity_doc_id_test',
  scopeId: 'scope_id_test',
  isEngineMetadataExist: true,
};

const defaultEntityData = {
  _id: '1',
  _source: {
    entity: { id: 'entity-123-test', EngineMetadata: { Type: 'host' } },
  },
};

const defaultEntityDataNoEngineMetadata = {
  _id: '1',
  _source: {
    entity: { id: 'entity-123-test' },
  },
};

// Create a custom TestProvider wrapper that allows overriding uiSettings
const TestProvidersWithUiSettings = ({
  children,
  assetInventoryEnabled = true,
}: {
  children: React.ReactNode;
  assetInventoryEnabled?: boolean;
}) => {
  const customStartServices = createStartServicesMock();
  customStartServices.uiSettings.get = jest
    .fn()
    .mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'securitySolution:enableAssetInventory') {
        return assetInventoryEnabled;
      }
      return defaultValue;
    });

  return <TestProviders startServices={customStartServices}>{children}</TestProviders>;
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

describe('GenericEntityPanel', () => {
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
      <TestProvidersWithUiSettings>
        <GenericEntityPanel {...mockProps} />
      </TestProvidersWithUiSettings>
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

  it('renders error state, empty engineMetadata ', () => {
    mockUseGetGenericEntity.mockReturnValue({
      getGenericEntity: {
        isLoading: false,
        isError: false,
        data: defaultEntityDataNoEngineMetadata,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <GenericEntityPanel {...mockProps} isEngineMetadataExist={false} />
      </TestProviders>
    );

    expect(
      queryByTestId('generic-right-flyout-error-prompt-missing-engineMetadataType')
    ).toBeInTheDocument();
  });

  it(`renders footer without 'show full entity details' text when not in preview mode`, () => {
    const { getByTestId, queryByTestId } = render(
      <TestProvidersWithUiSettings assetInventoryEnabled={true}>
        <GenericEntityPanel {...mockProps} isPreviewMode={false} />
      </TestProvidersWithUiSettings>
    );

    expect(getByTestId(GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ)).toBeInTheDocument();
    expect(
      queryByTestId(GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ)
    ).not.toBeInTheDocument();
  });

  it(`render footer and 'show full entity details' text when in preview mode`, () => {
    const { queryByTestId } = render(
      <TestProvidersWithUiSettings assetInventoryEnabled={true}>
        <GenericEntityPanel {...mockProps} isPreviewMode={true} />
      </TestProvidersWithUiSettings>
    );

    expect(queryByTestId(GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ)).toBeInTheDocument();
    expect(queryByTestId(GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ)).toBeInTheDocument();
  });
});
