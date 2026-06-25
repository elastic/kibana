/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import type { OpenTimelineResult } from './types';
import { useEditTimelineBatchActions } from './edit_timeline_batch_actions';
import { MAX_SUPER_TIMELINE_COUNT } from '../super_timeline/use_open_super_timeline';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => true),
}));

const mockOpenSuperTimeline = jest.fn();

jest.mock('../super_timeline/use_open_super_timeline', () => ({
  useOpenSuperTimeline: () => ({ openSuperTimeline: mockOpenSuperTimeline, isLoading: false }),
  MAX_SUPER_TIMELINE_COUNT: 10,
}));

jest.mock('./edit_timeline_actions', () => ({
  useEditTimelineActions: () => ({
    enableExportTimelineDownloader: jest.fn(),
    disableExportTimelineDownloader: jest.fn(),
    isEnableDownloader: false,
    isDeleteTimelineModalOpen: false,
    onOpenDeleteTimelineModal: jest.fn(),
    onCloseDeleteTimelineModal: jest.fn(),
  }),
}));

jest.mock('./export_timeline', () => ({
  EditTimelineActions: () => null,
}));

jest.mock('.', () => ({
  getSelectedTimelineIdsAndSearchIds: (items: OpenTimelineResult[]) =>
    items.map((i) => ({ savedObjectId: i.savedObjectId, searchId: undefined })),
  getRequestIds: (items: Array<{ savedObjectId?: string }>) => ({
    timelineIds: items.map((i) => i.savedObjectId).filter(Boolean),
    searchIds: undefined,
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeItem = (id: string): OpenTimelineResult => ({
  savedObjectId: id,
  title: `Timeline ${id}`,
  pinnedEventIds: {},
  noteIds: [],
  eventIdToNoteIds: {},
});

const tableRef = { current: null } as React.MutableRefObject<null>;

const renderBatchActions = (selectedItems: OpenTimelineResult[]) =>
  renderHook(() =>
    useEditTimelineBatchActions({
      selectedItems,
      tableRef,
      timelineType: TimelineTypeEnum.default,
    })
  );

// Render the popover content into DOM to inspect items
const renderPopoverContent = (selectedItems: OpenTimelineResult[]) => {
  const { result } = renderBatchActions(selectedItems);
  const { container } = render(result.current.getBatchItemsPopoverContent(() => {}));
  return container;
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('useEditTimelineBatchActions — "View Super Timeline" action', () => {
  describe('visibility', () => {
    it('renders the "View Super Timeline" item for the default timeline type', () => {
      renderPopoverContent([makeItem('a'), makeItem('b')]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeInTheDocument();
    });

    it('does NOT render the item for the template timeline type', () => {
      const { result } = renderHook(() =>
        useEditTimelineBatchActions({
          selectedItems: [makeItem('a'), makeItem('b')],
          tableRef,
          timelineType: TimelineTypeEnum.template,
        })
      );
      const { container } = render(result.current.getBatchItemsPopoverContent(() => {}));
      expect(container.querySelector('[data-test-subj="view-super-timeline-action"]')).toBeNull();
    });
  });

  describe('enabled / disabled state', () => {
    it('is disabled when 0 timelines are selected', () => {
      renderPopoverContent([]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });

    it('is disabled when 1 timeline is selected', () => {
      renderPopoverContent([makeItem('a')]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });

    it('is enabled when exactly 2 timelines are selected', () => {
      renderPopoverContent([makeItem('a'), makeItem('b')]);
      expect(screen.getByTestId('view-super-timeline-action')).not.toBeDisabled();
    });

    it('is enabled when MAX timelines are selected', () => {
      const items = Array.from({ length: MAX_SUPER_TIMELINE_COUNT }, (_, i) => makeItem(`id-${i}`));
      renderPopoverContent(items);
      expect(screen.getByTestId('view-super-timeline-action')).not.toBeDisabled();
    });

    it('is disabled when more than MAX timelines are selected', () => {
      const items = Array.from({ length: MAX_SUPER_TIMELINE_COUNT + 1 }, (_, i) =>
        makeItem(`id-${i}`)
      );
      renderPopoverContent(items);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });
  });

  describe('action invocation', () => {
    it('calls openSuperTimeline with the selected savedObjectIds when clicked', async () => {
      const user = userEvent.setup();
      renderPopoverContent([makeItem('id-1'), makeItem('id-2')]);

      await user.click(screen.getByTestId('view-super-timeline-action'));

      expect(mockOpenSuperTimeline).toHaveBeenCalledTimes(1);
      expect(mockOpenSuperTimeline).toHaveBeenCalledWith(['id-1', 'id-2']);
    });

    it('does not call openSuperTimeline when the action is disabled (1 selected)', async () => {
      const user = userEvent.setup();
      renderPopoverContent([makeItem('only-one')]);

      // The button is disabled — clicking it must not fire the handler
      const btn = screen.getByTestId('view-super-timeline-action');
      await user.click(btn);

      expect(mockOpenSuperTimeline).not.toHaveBeenCalled();
    });
  });
});
