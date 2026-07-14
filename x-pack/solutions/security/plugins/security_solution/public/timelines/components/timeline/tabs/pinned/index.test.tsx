/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import type { Dispatch } from 'redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { defaultHeaders, mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { defaultRowRenderers } from '../../body/renderers';
import type { SortColumnTimeline as Sort } from '../../../../../../common/types/timeline';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import type { Props as PinnedTabContentComponentProps } from '.';
import { PinnedTabContentComponent } from '.';
import { Direction } from '../../../../../../common/search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { useKibana } from '../../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../common/components/user_privileges/user_privileges_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';

jest.mock('../../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));
jest.mock('../../../../containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));
jest.mock('../../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../../../../../common/components/user_privileges');

jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled');

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

jest.mock('../../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn(),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

const kibanaMockResult = {
  services: createStartServicesMock(),
};

const useKibanaMock = useKibana as jest.Mock;
const SPECIAL_TEST_TIMEOUT = 30000;

describe('PinnedTabContent', () => {
  let props = {} as PinnedTabContentComponentProps;
  const mockOpenFlyout = jest.fn();
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;
  const sort: Sort[] = [
    {
      columnId: '@timestamp',
      columnType: 'date',
      esTypes: ['date'],
      sortDirection: Direction.desc,
    },
  ];

  beforeAll(() => {
    // https://github.com/atlassian/react-beautiful-dnd/blob/4721a518356f72f1dac45b5fd4ee9d466aa2996b/docs/guides/setup-problem-detection-and-error-recovery.md#disable-logging
    Object.defineProperty(window, '__@hello-pangea/dnd-disable-dev-warnings', {
      get() {
        return true;
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as DOMRect;
    });

    (useTimelineEvents as jest.Mock).mockReturnValue([
      false,
      {
        events: mockTimelineData.slice(0, 1),
        rawEvents: [],
        pageInfo: {
          activePage: 0,
          totalPages: 1,
        },
      },
    ]);
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, {}]);

    (useIsExperimentalFeatureEnabledMock as jest.Mock).mockImplementation(
      (feature: keyof ExperimentalFeatures) => {
        return allowedExperimentalValues[feature];
      }
    );

    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      notesPrivileges: { read: true },
      timelinePrivileges: { crud: true, read: true },
    });

    flyoutApi = createFlyoutApiMock();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);

    useKibanaMock.mockReturnValue(kibanaMockResult);

    props = {
      dispatch: {} as Dispatch,
      columns: defaultHeaders,
      timelineId: TimelineId.test,
      itemsPerPage: 5,
      itemsPerPageOptions: [5, 10, 20],
      renderCellValue: DefaultCellRenderer,
      rowRenderers: defaultRowRenderers,
      sort,
      pinnedEventIds: {},
      eventIdToNoteIds: {},
    };
  });

  describe('rendering', () => {
    test('should render timeline table correctly', async () => {
      render(
        <TestProviders>
          <PinnedTabContentComponent {...props} />
        </TestProviders>
      );

      expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
    });
  });

  describe('Leading actions - notes', () => {
    beforeEach(() => {
      // The notes control column only renders when the corresponding rawEvent is present,
      // so we provide a rawEvent that matches the first (and only) event.
      (useTimelineEvents as jest.Mock).mockReturnValue([
        false,
        {
          events: mockTimelineData.slice(0, 1),
          rawEvents: [
            {
              _id: mockTimelineData[0]._id,
              _index: 'test-index',
              _source: {},
            },
          ],
          pageInfo: {
            activePage: 0,
            totalPages: 1,
          },
        },
      ]);

      props = {
        ...props,
        pinnedEventIds: { [mockTimelineData[0]._id]: true },
      };
    });

    it(
      'should open the legacy notes flyout when the new flyout is disabled',
      async () => {
        render(
          <TestProviders>
            <PinnedTabContentComponent {...props} />
          </TestProviders>
        );

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
        });

        fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

        await waitFor(() => {
          expect(mockOpenFlyout).toHaveBeenCalledWith(
            expect.objectContaining({
              right: expect.objectContaining({ id: 'document-details-right' }),
              left: expect.objectContaining({ id: 'document-details-left' }),
            })
          );
        });
        expect(flyoutApi.openNotes).not.toHaveBeenCalled();
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should open the new notes flyout when the new flyout is enabled',
      async () => {
        jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

        render(
          <TestProviders>
            <PinnedTabContentComponent {...props} />
          </TestProviders>
        );

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
        });

        fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

        await waitFor(() => {
          expect(flyoutApi.openNotes).toHaveBeenCalledWith({
            hit: expect.objectContaining({ _id: mockTimelineData[0]._id }),
          });
        });
        expect(mockOpenFlyout).not.toHaveBeenCalled();
      },
      SPECIAL_TEST_TIMEOUT
    );
  });
});
