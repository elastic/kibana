/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { mount } from 'enzyme';
import React from 'react';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { mockGlobalState, TestProviders } from '../../../common/mock';

import type { Props as StatefulTimelineOwnProps } from '.';
import { StatefulTimeline } from '.';
import { useTimelineEvents } from '../../containers';
import { DefaultCellRenderer } from './cell_rendering/default_cell_renderer';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from './styles';
import { defaultRowRenderers } from './body/renderers';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../data_view_manager/hooks/__mocks__/use_data_view';

vi.mock('../../containers', () => {
  const mocked = {
    useTimelineEvents: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tabs', () => {
  const mocked = {
    TabsContent: () => <div data-test-subj="tabs-content" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/lib/kibana');

vi.mock('../../../common/utils/normalize_time_range');
vi.mock('@kbn/i18n-react', async () => {
  const { i18n } = await vi.importActual('@kbn/i18n');
  i18n.init({ locale: 'en' });
  const originalModule = await vi.importActual('@kbn/i18n-react');
  const FormattedRelative = vi.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
const mockUseResizeObserver: Mock = useResizeObserver as Mock;
vi.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));

vi.mock('../../../common/hooks/use_resolve_conflict', () => {
  return {
    useResolveConflict: vi.fn().mockImplementation(() => null),
  };
});

vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');

  return {
    ...original,
    useHistory: vi.fn(),
  };
});

const mockDispatch = vi.fn();
const mockRef = {
  current: null,
};

vi.mock('react-redux-v7', () => {
  const actual = require('react-redux-v7');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

describe('StatefulTimeline', () => {
  const props: StatefulTimelineOwnProps = {
    renderCellValue: DefaultCellRenderer,
    rowRenderers: defaultRowRenderers,
    timelineId: TimelineId.test,
    openToggleRef: mockRef,
  };

  beforeEach(() => {
    vi.mocked(useDataView).mockReturnValue(
      withIndices(
        mockGlobalState.timeline.timelineById[TimelineId.test]?.indexNames,
        mockGlobalState.timeline.timelineById[TimelineId.test]?.dataViewId as string
      )
    );

    vi.clearAllMocks();
    (useTimelineEvents as Mock).mockReturnValue([
      false,
      {
        events: [],
        pageInfo: {
          activePage: 0,
          totalPages: 10,
          querySize: 0,
        },
      },
    ]);
  });

  test('renders ', () => {
    const wrapper = mount(
      <TestProviders>
        <StatefulTimeline {...props} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="timeline"]')).toBeTruthy();
  });

  test(`it add attribute data-timeline-id in ${SELECTOR_TIMELINE_GLOBAL_CONTAINER}`, () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <StatefulTimeline {...props} />
        </DragDropContextWrapper>
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-timeline-id="timeline-test"].${SELECTOR_TIMELINE_GLOBAL_CONTAINER}`)
        .first()
        .exists()
    ).toEqual(true);
  });
});
