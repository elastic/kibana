/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InfraMetadata } from '../../../../../../common/http_api';
import { MetadataSummaryList, MetadataSummaryListCompact } from './metadata_summary_list';
import { useMetadataStateContext } from '../../../hooks/use_metadata_state';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../../types';

jest.mock('../../../hooks/use_metadata_state');
jest.mock('../../../hooks/use_tab_switcher');

const useMetadataStateContextMock = useMetadataStateContext as jest.MockedFunction<
  typeof useMetadataStateContext
>;
const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;

const TIMESTAMP = '2023-03-28T18:20:00.000Z';

const ecsHostMetadata = {
  id: 'host-1',
  name: 'host-1',
  features: [],
  info: {
    timestamp: TIMESTAMP,
    host: {
      name: 'host-1',
      ip: ['192.168.1.1'],
      os: {
        name: 'Ubuntu',
        version: '20.04',
      },
    },
    cloud: {
      provider: 'gcp',
    },
  },
} as InfraMetadata;

const semconvHostMetadata = {
  id: 'host-1',
  name: 'host-1',
  features: [],
  info: {
    timestamp: TIMESTAMP,
    resource: {
      attributes: {
        host: {
          ip: ['10.0.0.1'],
        },
        os: {
          name: 'Debian GNU/Linux',
          version: '12.4',
        },
        cloud: {
          provider: 'azure',
        },
      },
    },
  },
} as InfraMetadata;

const ecsContainerMetadata = {
  id: 'container-1',
  name: 'container-1',
  features: [],
  info: {
    timestamp: TIMESTAMP,
    container: {
      id: 'container-1',
      image: {
        name: 'nginx:latest',
      },
      runtime: 'docker',
    },
    host: {
      name: 'host-1',
    },
    cloud: {
      provider: 'aws',
      imageId: 'ami-0001',
      instance: {
        id: 'i-0001',
      },
    },
  },
} as InfraMetadata;

const mockShowTab = jest.fn();

const renderMetadataSummary = ({
  metadata = ecsHostMetadata,
  entityType = 'host' as InventoryItemType,
  schema = 'ecs' as DataSchemaFormat,
  Component = MetadataSummaryList as typeof MetadataSummaryList | typeof MetadataSummaryListCompact,
} = {}) =>
  render(
    <I18nProvider>
      <Component metadata={metadata} loading={false} entityType={entityType} schema={schema} />
    </I18nProvider>
  );

// Each summary item renders the field label as the description list term and the field value as
// its description, so reading both keeps the assertions tied to what the user sees.
const getSummaryFields = () =>
  screen.getAllByTestId('infraMetadataSummaryItem').map((item) => ({
    label: within(item).getByRole('term').textContent,
    value: within(item).getByRole('definition').textContent,
  }));

describe('MetadataSummaryList', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useMetadataStateContextMock.mockReturnValue({
      metadata: ecsHostMetadata,
      loading: false,
      error: null,
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useMetadataStateContext>);

    useTabSwitcherContextMock.mockReturnValue({
      showTab: mockShowTab,
      activeTabId: ContentTabIds.OVERVIEW,
    } as unknown as ReturnType<typeof useTabSwitcherContext>);
  });

  it('renders the metadata section as collapsible with a Show all action', () => {
    renderMetadataSummary();

    expect(screen.getByTestId('infraAssetDetailsMetadataCollapsible')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsMetadataShowAllButton')).toBeVisible();
  });

  it('switches to the metadata tab when Show all is clicked', async () => {
    renderMetadataSummary();

    await userEvent.click(screen.getByTestId('infraAssetDetailsMetadataShowAllButton'));

    expect(mockShowTab).toHaveBeenCalledWith(ContentTabIds.METADATA);
  });

  it('keeps the Show all action available for containers', async () => {
    renderMetadataSummary({ metadata: ecsContainerMetadata, entityType: 'container' });

    await userEvent.click(screen.getByTestId('infraAssetDetailsMetadataShowAllButton'));

    expect(mockShowTab).toHaveBeenCalledWith(ContentTabIds.METADATA);
  });

  it('renders the ECS host fields with their values', () => {
    renderMetadataSummary();

    expect(getSummaryFields()).toEqual([
      { label: 'Host IP', value: '192.168.1.1' },
      { label: 'Host OS version', value: '20.04' },
      { label: 'Cloud provider', value: 'gcp' },
      { label: 'Operating system', value: 'Ubuntu' },
    ]);
  });

  it('reads the host fields from the resource attributes for the semconv schema', () => {
    renderMetadataSummary({ metadata: semconvHostMetadata, schema: 'semconv' });

    expect(getSummaryFields()).toEqual([
      { label: 'Host IP', value: '10.0.0.1' },
      { label: 'Host OS version', value: '12.4' },
      { label: 'Cloud provider', value: 'azure' },
      { label: 'Operating system', value: 'Debian GNU/Linux' },
    ]);
  });

  it('renders the container fields with their values', () => {
    renderMetadataSummary({ metadata: ecsContainerMetadata, entityType: 'container' });

    expect(getSummaryFields()).toEqual([
      { label: 'Container ID', value: 'container-1' },
      { label: 'Container image name', value: 'nginx:latest' },
      { label: 'Host name', value: 'host-1' },
      { label: 'Runtime', value: 'docker' },
      { label: 'Cloud instance ID', value: 'i-0001' },
      { label: 'Cloud image ID', value: 'ami-0001' },
      { label: 'Cloud provider', value: 'aws' },
    ]);
  });

  it('falls back to N/A when a field is missing from the metadata', () => {
    renderMetadataSummary({
      metadata: { ...ecsHostMetadata, info: { timestamp: TIMESTAMP } } as InfraMetadata,
    });

    expect(getSummaryFields()).toEqual([
      { label: 'Host IP', value: 'N/A' },
      { label: 'Host OS version', value: 'N/A' },
      { label: 'Cloud provider', value: 'N/A' },
      { label: 'Operating system', value: 'N/A' },
    ]);
  });
});

describe('MetadataSummaryListCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useMetadataStateContextMock.mockReturnValue({
      metadata: ecsHostMetadata,
      loading: false,
      error: null,
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useMetadataStateContext>);

    useTabSwitcherContextMock.mockReturnValue({
      showTab: mockShowTab,
      activeTabId: ContentTabIds.OVERVIEW,
    } as unknown as ReturnType<typeof useTabSwitcherContext>);
  });

  it('drops the extended host fields kept by the full variant', () => {
    renderMetadataSummary({ Component: MetadataSummaryListCompact });

    expect(getSummaryFields()).toEqual([
      { label: 'Host IP', value: '192.168.1.1' },
      { label: 'Host OS version', value: '20.04' },
    ]);
  });

  it('drops the extended container fields kept by the full variant', () => {
    renderMetadataSummary({
      metadata: ecsContainerMetadata,
      entityType: 'container',
      Component: MetadataSummaryListCompact,
    });

    expect(getSummaryFields()).toEqual([
      { label: 'Container ID', value: 'container-1' },
      { label: 'Container image name', value: 'nginx:latest' },
      { label: 'Host name', value: 'host-1' },
    ]);
  });
});
