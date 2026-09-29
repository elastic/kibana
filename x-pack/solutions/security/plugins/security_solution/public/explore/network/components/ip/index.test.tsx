/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { screen, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock/test_providers';
import { Ip } from '.';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { mockFlyoutApi } from '../../../../flyout/document_details/shared/mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useWhichFlyout } from '../../../../flyout/document_details/shared/hooks/use_which_flyout';
import { NetworkPanelKey } from '../../../../flyout/network_details';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';

const mockedTelemetry = createTelemetryServiceMock();
vi.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
        uiSettings: {
          get: vi.fn().mockReturnValue(false),
        },
      },
    }),
    useUiSetting: () => false,
  };
});

vi.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => {
      const mocked = {
      useEntityFromStore: vi.fn().mockReturnValue({
        entity: null,
        entityRecord: null,
        firstSeen: null,
        lastSeen: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: vi.fn(),
      ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../flyout/document_details/shared/hooks/use_which_flyout', () => {
      const mocked = {
      useWhichFlyout: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../flyout_v2/use_flyout_api');
vi.mock('../../../../common/hooks/use_is_new_flyout_enabled');

vi.mock('@elastic/eui', async () => {
  const original = (await vi.importActual('@elastic/eui'));
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

vi.mock('../../../../common/components/links/link_props');

describe('Port', () => {
  beforeEach(() => {
    vi.mocked(useWhichFlyout).mockReturnValue(null);
    vi.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    vi.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  test('renders correctly against snapshot', () => {
    const { container } = render(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );
    expect(container.children[0]).toMatchSnapshot();
  });

  test('it renders the the ip address', () => {
    render(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(screen.getByTestId('network-details')).toHaveTextContent('10.1.2.3');
  });

  test('it displays a button which opens the network flyout', () => {
    render(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );
    const link = screen.getByTestId('network-details');
    link.click();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: NetworkPanelKey,
        params: { ip: '10.1.2.3', scopeId: '', flowTarget: 'destination' },
      },
    });
  });
});
