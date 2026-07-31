/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { render, screen, renderHook, fireEvent } from '@testing-library/react';
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
const mockUseOpenSuperTimeline = jest.fn();

jest.mock('../super_timeline/use_open_super_timeline', () => ({
  useOpenSuperTimeline: (...args: unknown[]) => mockUseOpenSuperTimeline(...args),
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

const makeItem = (id: string, overrides: Partial<OpenTimelineResult> = {}): OpenTimelineResult => ({
  savedObjectId: id,
  title: `Timeline ${id}`,
  pinnedEventIds: {},
  noteIds: [],
  eventIdToNoteIds: {},
  ...overrides,
});

const makeEsqlItem = (id: string): OpenTimelineResult =>
  makeItem(id, { savedSearchId: `saved-search-${id}` });

const makeEqlItem = (id: string): OpenTimelineResult =>
  makeItem(id, { queryType: { hasQuery: false, hasEql: true } });

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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOpenSuperTimeline.mockReturnValue({
    openSuperTimeline: mockOpenSuperTimeline,
    isLoading: false,
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

  describe('unsupported query types (gate prevents empty Super Timeline Query tab)', () => {
    it('is disabled when the selection contains an ES|QL timeline', () => {
      renderPopoverContent([makeItem('kql-1'), makeItem('kql-2'), makeEsqlItem('esql-1')]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });

    it('is disabled when the selection contains an EQL timeline', () => {
      renderPopoverContent([makeItem('kql-1'), makeItem('kql-2'), makeEqlItem('eql-1')]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });

    it('is enabled for an all-KQL selection within the count limits', () => {
      renderPopoverContent([makeItem('kql-1'), makeItem('kql-2')]);
      expect(screen.getByTestId('view-super-timeline-action')).not.toBeDisabled();
    });

    it('tooltip names the offending ES|QL timeline and its type so the user can deselect it', async () => {
      // The tooltip text is the recovery affordance — naming the timeline AND its type makes
      // "deselect and retry" actionable without guessing which row to remove or why it's blocked.
      renderPopoverContent([makeItem('kql-1'), makeEsqlItem('esql-1')]);
      const btn = screen.getByTestId('view-super-timeline-action');
      // EuiContextMenuItem wraps in EuiToolTip when toolTipContent is set.
      // Trigger the tooltip by hovering the wrapper span (fireEvent bypasses pointer-events).
      fireEvent.mouseOver(btn);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Timeline esql-1 (ES|QL)');
    });

    it('tooltip names the offending EQL timeline and its type', async () => {
      renderPopoverContent([makeItem('kql-1'), makeEqlItem('eql-1')]);
      const btn = screen.getByTestId('view-super-timeline-action');
      fireEvent.mouseOver(btn);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Timeline eql-1 (EQL)');
    });

    it('is disabled when all selected timelines are ES|QL (no KQL in selection)', () => {
      renderPopoverContent([makeEsqlItem('esql-1'), makeEsqlItem('esql-2')]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });

    it('is disabled when all selected timelines are EQL (no KQL in selection)', () => {
      renderPopoverContent([makeEqlItem('eql-1'), makeEqlItem('eql-2')]);
      expect(screen.getByTestId('view-super-timeline-action')).toBeDisabled();
    });

    it('re-enables when the offending timeline is removed from the selection', () => {
      // Uses renderHook with initialProps so rerender() actually changes the prop value —
      // calling renderBatchActions twice creates two independent hook instances and proves nothing.
      const { result, rerender } = renderHook(
        ({ items }: { items: OpenTimelineResult[] }) =>
          useEditTimelineBatchActions({
            selectedItems: items,
            tableRef,
            timelineType: TimelineTypeEnum.default,
          }),
        { initialProps: { items: [makeItem('kql-1'), makeEsqlItem('esql-1')] } }
      );

      const { container: containerBefore } = render(
        result.current.getBatchItemsPopoverContent(() => {})
      );
      expect(
        containerBefore.querySelector('[data-test-subj="view-super-timeline-action"]')
      ).toBeDisabled();

      // Simulate the user deselecting the ES|QL timeline
      rerender({ items: [makeItem('kql-1'), makeItem('kql-2')] });

      const { container: containerAfter } = render(
        result.current.getBatchItemsPopoverContent(() => {})
      );
      expect(
        containerAfter.querySelector('[data-test-subj="view-super-timeline-action"]')
      ).not.toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('is disabled while a Super Timeline fetch is in flight to prevent racing concurrent requests', () => {
      mockUseOpenSuperTimeline.mockReturnValue({
        openSuperTimeline: mockOpenSuperTimeline,
        isLoading: true,
      });
      renderPopoverContent([makeItem('a'), makeItem('b')]);
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
      // pointerEventsCheck: 0 because EuiContextMenuItem wraps disabled+tooltip items in a
      // span with pointer-events: none; we still need to attempt the click to assert the
      // handler is never invoked.
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderPopoverContent([makeItem('only-one')]);

      const btn = screen.getByTestId('view-super-timeline-action');
      await user.click(btn);

      expect(mockOpenSuperTimeline).not.toHaveBeenCalled();
    });
  });
});
