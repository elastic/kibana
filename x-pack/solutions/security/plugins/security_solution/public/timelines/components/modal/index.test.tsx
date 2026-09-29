/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineModal } from '.';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useUnmanagedFlyoutZIndex } from '../../../common/hooks/use_unmanaged_flyout_z_index';
import { timelineFlyoutHistoryKey } from '../../../flyout_v2/shared/constants/flyout_history';

const mockCapturedFlyoutSessionContext = vi.fn();
vi.mock('../timeline', async () => {
  const { useFlyoutSessionContext } = await vi.importActual('../../../flyout_v2/session_context');
  return {
    StatefulTimeline: () => {
      mockCapturedFlyoutSessionContext(useFlyoutSessionContext());
      return <div data-test-subj="StatefulTimelineMock" />;
    },
  };
});

vi.mock('../../../common/hooks/use_is_new_flyout_enabled');
vi.mock('../../../common/hooks/use_unmanaged_flyout_z_index');

const mockIsFullScreen = vi.fn(() => false);
vi.mock('../../../common/store/selectors', () => {
  const mocked = {
    inputsSelectors: { timelineFullScreenSelector: () => mockIsFullScreen() },
  };
  return { ...mocked, default: mocked };
});

const mockRef = {
  current: null,
};

const renderTimelineModal = () =>
  render(
    <TestProviders>
      <TimelineModal timelineId={TimelineId.test} openToggleRef={mockRef} />
    </TestProviders>
  );

describe('TimelineModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    vi.mocked(useUnmanagedFlyoutZIndex).mockReturnValue(undefined);
  });

  it('should render the timeline', async () => {
    const { getByTestId } = renderTimelineModal();

    expect(getByTestId('StatefulTimelineMock')).toBeInTheDocument();
  });

  it('should render without fullscreen className', async () => {
    mockIsFullScreen.mockReturnValue(false);

    const { getByTestId } = renderTimelineModal();

    expect(getByTestId('timeline-portal-overlay-mask')).not.toHaveClass(
      'timeline-portal-overlay-mask--full-screen'
    );
  });

  it('should render with fullscreen className', async () => {
    mockIsFullScreen.mockReturnValue(true);

    const { getByTestId } = renderTimelineModal();

    expect(getByTestId('timeline-portal-overlay-mask')).toHaveClass(
      'timeline-portal-overlay-mask--full-screen'
    );
  });

  it('passes its visibility down to useUnmanagedFlyoutZIndex', () => {
    renderTimelineModal();

    expect(useUnmanagedFlyoutZIndex).toHaveBeenCalledWith({
      id: 'security-solution-timeline',
      active: true,
    });
  });

  describe('when the new flyout system is enabled', () => {
    beforeEach(() => {
      vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);
    });

    it('scopes flyouts opened from within Timeline to their own, dedicated history key', () => {
      renderTimelineModal();

      expect(mockCapturedFlyoutSessionContext).toHaveBeenCalledWith({
        session: 'start',
        historyKey: timelineFlyoutHistoryKey,
        isChildFlyout: false,
      });
    });
  });

  describe('when the new flyout system is disabled', () => {
    beforeEach(() => {
      vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    });

    it('does not scope flyouts opened from within Timeline to a dedicated history key', () => {
      renderTimelineModal();

      expect(mockCapturedFlyoutSessionContext).toHaveBeenCalledTimes(1);
      const [context] = mockCapturedFlyoutSessionContext.mock.calls[0];
      expect(context.historyKey).not.toBe(timelineFlyoutHistoryKey);
    });
  });
});
