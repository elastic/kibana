/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../../../common/api/timeline';
import { SaveTimelineModal } from './save_timeline_modal';
import * as i18n from './translations';

jest.mock('../../../hooks/use_create_timeline', () => ({
  useCreateTimeline: jest.fn(),
}));

const mockGetState = jest.fn();
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSelector: (selector: any) =>
      selector({
        timeline: {
          timelineById: {
            'timeline-1': {
              ...mockGetState(),
            },
          },
        },
      }),
  };
});

const renderSaveTimelineModal = (showWarning?: boolean) =>
  render(
    <TestProviders>
      <SaveTimelineModal
        initialFocusOn="title"
        closeSaveTimeline={jest.fn()}
        timelineId="timeline-1"
        showWarning={showWarning}
      />
    </TestProviders>
  );

describe('SaveTimelineModal', () => {
  describe('save timeline', () => {
    it('should show process bar while saving', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        isSaving: true,
      });

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should show correct header for save timeline modal', () => {
      mockGetState.mockReturnValue(mockTimelineModel);

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('save-timeline-modal-header')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-header')).toHaveTextContent(i18n.SAVE_TIMELINE);
    });

    it('should show correct header for save timeline template modal', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        status: TimelineStatusEnum.draft,
        timelineType: TimelineTypeEnum.template,
      });

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('save-timeline-modal-header')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-header')).toHaveTextContent(
        i18n.SAVE_TIMELINE_TEMPLATE
      );
    });

    it('should render all the dom elements of the modal', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        status: TimelineStatusEnum.draft,
      });

      const { getByTestId, queryByTestId } = renderSaveTimelineModal();

      expect(getByTestId('save-timeline-modal-title-input')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-description-input')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-description-input')).toHaveTextContent(
        'This is a sample rule description'
      );
      expect(getByTestId('save-timeline-modal-close-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-save-button')).toBeInTheDocument();
      expect(queryByTestId('save-timeline-modal-save-as-new-switch')).not.toBeInTheDocument();
    });
  });

  describe('edit timeline', () => {
    it('should show process bar while saving', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        isSaving: true,
        title: 'my timeline',
      });

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should show correct header for edit timeline template modal', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        status: TimelineStatusEnum.active,
      });

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('save-timeline-modal-header')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-header')).toHaveTextContent(i18n.SAVE_TIMELINE);
    });

    it('should show correct header for save timeline template modal', () => {
      mockGetState.mockReturnValue({
        status: TimelineStatusEnum.active,
        timelineType: TimelineTypeEnum.template,
      });

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('save-timeline-modal-header')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-header')).toHaveTextContent(
        i18n.NAME_TIMELINE_TEMPLATE
      );
    });

    it('should render all the dom elements of the modal', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        description: 'my description',
        status: TimelineStatusEnum.active,
        title: 'my timeline',
        timelineType: TimelineTypeEnum.default,
      });

      const { getByTestId } = renderSaveTimelineModal();

      expect(getByTestId('save-timeline-modal-title-input')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-title-input')).toHaveProperty('value', 'my timeline');
      expect(getByTestId('save-timeline-modal-description-input')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-description-input')).toHaveTextContent(
        'my description'
      );
      expect(getByTestId('save-timeline-modal-close-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-save-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-save-as-new-switch')).toBeInTheDocument();
    });
  });

  describe('showWarning', () => {
    it('should show EuiCallOut', () => {
      const { getByTestId } = renderSaveTimelineModal(true);

      expect(getByTestId('save-timeline-modal-callout')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-callout')).toHaveTextContent(
        'You have an unsaved timeline. Do you wish to save it?'
      );
    });

    it('should show discard timeline in the close button', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        status: TimelineStatusEnum.draft,
      });

      const { getByTestId } = renderSaveTimelineModal(true);

      expect(getByTestId('save-timeline-modal-save-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-close-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-close-button')).toHaveTextContent('Discard Timeline');
    });

    it('should show discard timeline template in the close button', () => {
      mockGetState.mockReturnValue({
        ...mockTimelineModel,
        timelineType: TimelineTypeEnum.template,
        status: TimelineStatusEnum.draft,
      });

      const { getByTestId } = renderSaveTimelineModal(true);

      expect(getByTestId('save-timeline-modal-save-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-close-button')).toBeInTheDocument();
      expect(getByTestId('save-timeline-modal-close-button')).toHaveTextContent(
        'Discard Timeline Template'
      );
    });
  });
});
