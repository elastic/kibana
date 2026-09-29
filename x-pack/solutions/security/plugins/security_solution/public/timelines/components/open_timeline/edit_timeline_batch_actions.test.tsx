/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import type { OpenTimelineResult } from './types';
import { useEditTimelineBatchActions } from './edit_timeline_batch_actions';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockHandleOpen = vi.fn();
const mockUseSuperTimelineGate = vi.fn();

vi.mock('./use_super_timeline_gate', () => {
      const mocked = {
      useSuperTimelineGate: (...args: unknown[]) => mockUseSuperTimelineGate(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./edit_timeline_actions', () => {
      const mocked = {
      useEditTimelineActions: () => ({
        enableExportTimelineDownloader: vi.fn(),
        disableExportTimelineDownloader: vi.fn(),
        isEnableDownloader: false,
        isDeleteTimelineModalOpen: false,
        onOpenDeleteTimelineModal: vi.fn(),
        onCloseDeleteTimelineModal: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./export_timeline', () => {
      const mocked = {
      EditTimelineActions: () => null,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('.', () => {
      const mocked = {
      getSelectedTimelineIdsAndSearchIds: (items: OpenTimelineResult[]) =>
        items.map((i) => ({ savedObjectId: i.savedObjectId, searchId: undefined })),
      getRequestIds: (items: Array<{ savedObjectId?: string }>) => ({
        timelineIds: items.map((i) => i.savedObjectId).filter(Boolean),
        searchIds: undefined,
      }),
    };
      return { ...mocked, default: mocked };
    });

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeItem = (id: string): OpenTimelineResult => ({
  savedObjectId: id,
  title: `Timeline ${id}`,
  pinnedEventIds: {},
  noteIds: [],
  eventIdToNoteIds: {},
});

const tableRef = { current: null } as React.MutableRefObject<null>;

const renderPopoverContent = (selectedItems: OpenTimelineResult[]) => {
  const { result } = renderHook(() =>
    useEditTimelineBatchActions({
      selectedItems,
      tableRef,
      timelineType: TimelineTypeEnum.default,
    })
  );
  const { container } = render(result.current.getBatchItemsPopoverContent(() => {}));
  return container;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSuperTimelineGate.mockReturnValue({
    isEnabled: true,
    tooltip: undefined,
    handleOpen: mockHandleOpen,
  });
});

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

  describe('action invocation', () => {
    it('calls handleOpen when the enabled item is clicked', async () => {
      const user = userEvent.setup();
      renderPopoverContent([makeItem('id-1'), makeItem('id-2')]);
      await user.click(screen.getByTestId('view-super-timeline-action'));
      expect(mockHandleOpen).toHaveBeenCalledTimes(1);
    });

    it('does not call handleOpen when the item is disabled', async () => {
      mockUseSuperTimelineGate.mockReturnValue({
        isEnabled: false,
        tooltip: 'Select at least 2 timelines.',
        handleOpen: mockHandleOpen,
      });
      // pointerEventsCheck: 0 because EuiContextMenuItem wraps disabled+tooltip items in a
      // span with pointer-events: none; we still need to attempt the click to verify the
      // handler is never invoked.
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderPopoverContent([makeItem('only-one')]);
      await user.click(screen.getByTestId('view-super-timeline-action'));
      expect(mockHandleOpen).not.toHaveBeenCalled();
    });
  });
});
