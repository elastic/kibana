/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDispatch } from 'react-redux-v7';
import { TestProviders } from '../../../../common/mock';
import { RegularTimelineModalHeader } from './regular_timeline_modal_header';
import { useCreateTimeline } from '../../../hooks/use_create_timeline';
import { useInspect } from '../../../../common/components/inspect/use_inspect';
import { useIsInspectDisabled } from './use_is_inspect_disabled';
import { useKibana } from '../../../../common/lib/kibana';
import { timelineActions } from '../../../store';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import * as i18n from '../translations';

vi.mock('../../../hooks/use_create_timeline');
vi.mock('../../../../common/components/inspect/use_inspect');
vi.mock('./use_is_inspect_disabled');
vi.mock('../../../../common/lib/kibana');

const mockGetState = vi.fn().mockReturnValue({});
vi.mock('react-redux-v7', () => {
  const actual = require('react-redux-v7');
  return {
    ...actual,
    useDispatch: vi.fn(),
    useSelector: (selector: (s: unknown) => unknown) =>
      selector({
        timeline: {
          timelineById: {
            'timeline-1': mockGetState(),
          },
        },
        dataViewManager: { timeline: {} },
      }),
  };
});

const timelineId = 'timeline-1';
const mockRef = { current: null };

const renderComponent = () =>
  render(
    <TestProviders>
      <RegularTimelineModalHeader timelineId={timelineId} openToggleRef={mockRef} />
    </TestProviders>
  );

describe('RegularTimelineModalHeader', () => {
  beforeEach(() => {
    mockGetState.mockReturnValue({ timelineType: TimelineTypeEnum.default });
    (useDispatch as Mock).mockReturnValue(vi.fn());
    (useCreateTimeline as Mock).mockReturnValue(vi.fn());
    (useInspect as Mock).mockReturnValue(vi.fn());
    (useIsInspectDisabled as Mock).mockReturnValue(false);
  });

  it('renders all regular timeline elements', () => {
    renderComponent();

    expect(screen.getByTestId('timeline-favorite-empty-star')).toBeInTheDocument();
    expect(screen.getByText('Untitled Timeline')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-save-status')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-header-actions')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-new-timeline-dropdown-button')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-open-timeline-button')).toBeInTheDocument();
    expect(screen.getByTestId('inspect-empty-button')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-save-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-modal-header-close-button')).toBeInTheDocument();
  });

  it('shows Attach to Case button when user has the correct permissions', () => {
    (useKibana as Mock).mockReturnValue({
      services: {
        application: { navigateToApp: vi.fn() },
        cases: {
          helpers: {
            canUseCases: vi.fn().mockReturnValue({ createComment: true, read: true }),
          },
          hooks: {
            useCasesAddToNewCaseFlyout: vi.fn().mockReturnValue({ open: vi.fn() }),
            useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({ open: vi.fn() }),
          },
          config: { attachmentsEnabled: false },
        },
        uiSettings: { get: vi.fn() },
      },
    });

    renderComponent();

    expect(screen.getByTestId('timeline-modal-attach-to-case-dropdown-button')).toBeInTheDocument();
  });

  it('close button has correct aria-label for a default timeline', () => {
    renderComponent();

    expect(screen.getByTestId('timeline-modal-header-close-button')).toHaveAttribute(
      'aria-label',
      i18n.CLOSE_TIMELINE_OR_TEMPLATE(true)
    );
  });

  it('close button has correct aria-label for a template timeline', () => {
    mockGetState.mockReturnValue({ timelineType: TimelineTypeEnum.template });

    renderComponent();

    expect(screen.getByTestId('timeline-modal-header-close-button')).toHaveAttribute(
      'aria-label',
      i18n.CLOSE_TIMELINE_OR_TEMPLATE(false)
    );
  });

  it('dispatches showTimeline(false) when close button is clicked', async () => {
    const mockDispatch = vi.fn();
    (useDispatch as Mock).mockReturnValue(mockDispatch);
    const spy = vi.spyOn(timelineActions, 'showTimeline');

    renderComponent();
    await userEvent.click(screen.getByTestId('timeline-modal-header-close-button'));

    expect(spy).toHaveBeenCalledWith({ id: timelineId, show: false });
    expect(mockDispatch).toHaveBeenCalled();
  });
});
