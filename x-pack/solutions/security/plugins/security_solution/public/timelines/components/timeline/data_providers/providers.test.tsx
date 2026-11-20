/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../../common/mock/test_providers';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';

import { timelineActions } from '../../../store';
import { mockDataProviders } from './mock/mock_data_providers';
import { Providers } from './providers';
import * as i18n from './translations';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types/timeline';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn(),
  useDeepEqualSelector: jest.fn(),
}));

describe('Providers', () => {
  // EUI keeps the opening popover panel at `pointer-events: none` in jsdom (the animation never ends)
  const menuUser = userEvent.setup({ pointerEventsCheck: 0 });

  const mockOnDataProviderRemoved = jest.spyOn(timelineActions, 'removeProvider');

  beforeEach(() => {
    jest.clearAllMocks();
    (useDeepEqualSelector as jest.Mock).mockReturnValue({});
  });

  describe('rendering', () => {
    test('it renders the data providers', () => {
      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      mockDataProviders.forEach((dataProvider) =>
        expect(
          screen.getAllByText(
            new RegExp(`${dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value}`)
          ).length
        ).toBeGreaterThan(0)
      );
    });
  });

  describe('#onDataProviderRemoved', () => {
    test('it invokes the onDataProviderRemoved callback when the close button is clicked', async () => {
      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      await userEvent.click(screen.getAllByLabelText(i18n.REMOVE_DATA_PROVIDER)[0]);
      expect(mockOnDataProviderRemoved.mock.calls[0][0].providerId).toEqual('id-Provider 1');
    });

    test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', async () => {
      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );
      await userEvent.click(screen.getAllByTestId('providerBadge')[0]);

      await menuUser.click(screen.getByText(i18n.DELETE_DATA_PROVIDER));
      expect(mockOnDataProviderRemoved.mock.calls[0][0].providerId).toEqual('id-Provider 1');
    });
  });

  describe('#onToggleDataProviderEnabled', () => {
    test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', async () => {
      const mockOnToggleDataProviderEnabled = jest.spyOn(
        timelineActions,
        'updateDataProviderEnabled'
      );
      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      await userEvent.click(screen.getAllByTestId('providerBadge')[0]);

      await menuUser.click(screen.getByText(i18n.TEMPORARILY_DISABLE_DATA_PROVIDER));
      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        andProviderId: undefined,
        enabled: false,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });
  });

  describe('#onToggleDataProviderExcluded', () => {
    test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', async () => {
      const mockOnToggleDataProviderExcluded = jest.spyOn(
        timelineActions,
        'updateDataProviderExcluded'
      );

      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      await userEvent.click(screen.getAllByTestId('providerBadge')[0]);

      await menuUser.click(screen.getByText(i18n.EXCLUDE_DATA_PROVIDER));

      expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        andProviderId: undefined,
        excluded: true,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });
  });

  describe('#ProviderWithAndProvider', () => {
    test('Rendering And Provider', () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      const andProviderBadges = screen.getAllByTestId('providerBadge');
      expect(andProviderBadges).toHaveLength(3);
      expect(andProviderBadges.map((node) => node.textContent).join(' ')).toEqual(
        'name: "Provider 1" name: "Provider 2" name: "Provider 3"'
      );
    });

    test('it invokes the onDataProviderRemoved callback when you click on the close button is clicked', async () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);

      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={mockDataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      await userEvent.click(screen.getAllByLabelText(i18n.REMOVE_DATA_PROVIDER)[1]);

      expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', async () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderEnabled = jest.spyOn(
        timelineActions,
        'updateDataProviderEnabled'
      );

      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      await userEvent.click(screen.getAllByTestId('providerBadge')[1]);

      await menuUser.click(screen.getByText(i18n.TEMPORARILY_DISABLE_DATA_PROVIDER));

      expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        enabled: false,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });

    test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', async () => {
      const dataProviders = mockDataProviders.slice(0, 1);
      dataProviders[0].and = mockDataProviders.slice(1, 3);
      const mockOnToggleDataProviderExcluded = jest.spyOn(
        timelineActions,
        'updateDataProviderExcluded'
      );

      render(
        <TestProviders>
          <DroppableWrapper droppableId="unitTest">
            <Providers
              browserFields={{}}
              dataProviders={dataProviders}
              timelineId={TimelineId.test}
            />
          </DroppableWrapper>
        </TestProviders>
      );

      await userEvent.click(screen.getAllByTestId('providerBadge')[1]);

      await menuUser.click(screen.getByText(i18n.EXCLUDE_DATA_PROVIDER));

      expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
        andProviderId: 'id-Provider 2',
        excluded: true,
        id: 'timeline-test',
        providerId: 'id-Provider 1',
      });
    });
  });
});
