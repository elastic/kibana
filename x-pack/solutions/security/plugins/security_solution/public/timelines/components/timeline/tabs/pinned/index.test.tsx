/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';
import type { Dispatch } from 'redux-v4';
import { render, screen } from '@testing-library/react';

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

vi.mock('../../../../containers', () => {
      const mocked = {
      useTimelineEvents: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../containers/details', () => {
      const mocked = {
      useTimelineEventsDetails: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../fields_browser', () => {
      const mocked = {
      useFieldBrowserOptions: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/components/user_privileges');

vi.mock('@kbn/expandable-flyout');
vi.mock('../../../../../flyout_v2/use_flyout_api');
vi.mock('../../../../../common/hooks/use_is_new_flyout_enabled');

vi.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as Mock;

const mockUseResizeObserver: Mock = useResizeObserver as Mock;
vi.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

vi.mock('../../../../../common/lib/kibana', async () => {
  const originalModule = (await vi.importActual('../../../../../common/lib/kibana'));
  return {
    ...originalModule,
    useKibana: vi.fn(),
    useGetUserSavedObjectPermissions: vi.fn(),
  };
});

const kibanaMockResult = {
  services: createStartServicesMock(),
};

const useKibanaMock = useKibana as Mock;

describe('PinnedTabContent', () => {
  let props = {} as PinnedTabContentComponentProps;
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
    vi.clearAllMocks();

    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => {
      return {
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as DOMRect;
    });

    (useTimelineEvents as Mock).mockReturnValue([
      false,
      {
        events: mockTimelineData.slice(0, 1),
        rawEvents: [],
        pageInfo: {
          activePage: 0,
          totalPages: 1,
        },
        isPartial: false,
        shardFailures: [],
        timedOut: false,
      },
    ]);
    (useTimelineEventsDetails as Mock).mockReturnValue([false, {}]);

    (useIsExperimentalFeatureEnabledMock as Mock).mockImplementation(
      (feature: keyof ExperimentalFeatures) => {
        return allowedExperimentalValues[feature];
      }
    );

    (useUserPrivileges as Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      notesPrivileges: { read: true },
      timelinePrivileges: { crud: true, read: true },
    });

    vi.mocked(useExpandableFlyoutApi).mockReturnValue(createExpandableFlyoutApiMock());
    vi.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);

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
});
