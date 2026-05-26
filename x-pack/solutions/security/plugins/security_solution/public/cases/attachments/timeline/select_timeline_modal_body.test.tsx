/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectTimelineModalBody } from './select_timeline_modal_body';

jest.mock('../../../timelines/components/timeline/selectable_timeline', () => ({
  SelectableTimeline: ({
    onTimelineChange,
    onClosePopover,
  }: {
    onTimelineChange: (title: string, id: string | null) => void;
    onClosePopover: () => void;
  }) => (
    <div data-test-subj="selectable-timeline-mock">
      <button
        type="button"
        data-test-subj="selectable-timeline-mock-pick"
        onClick={() => onTimelineChange('Investigation', 'so-id-1')}
      >
        {'pick'}
      </button>
      <button
        type="button"
        data-test-subj="selectable-timeline-mock-pick-null"
        onClick={() => onTimelineChange('Investigation', null)}
      >
        {'pick-null'}
      </button>
      <button
        type="button"
        data-test-subj="selectable-timeline-mock-close"
        onClick={onClosePopover}
      >
        {'close'}
      </button>
    </div>
  ),
}));

describe('SelectTimelineModalBody', () => {
  it('forwards SelectableTimeline (title, id) selections to onTimelineChange', async () => {
    const onTimelineChange = jest.fn();
    const onClose = jest.fn();
    render(<SelectTimelineModalBody onTimelineChange={onTimelineChange} onClose={onClose} />);

    await userEvent.click(screen.getByTestId('selectable-timeline-mock-pick'));
    expect(onTimelineChange).toHaveBeenCalledWith('Investigation', 'so-id-1');

    await userEvent.click(screen.getByTestId('selectable-timeline-mock-pick-null'));
    expect(onTimelineChange).toHaveBeenCalledWith('Investigation', null);
  });

  it('forwards onClose', async () => {
    const onTimelineChange = jest.fn();
    const onClose = jest.fn();
    render(<SelectTimelineModalBody onTimelineChange={onTimelineChange} onClose={onClose} />);

    await userEvent.click(screen.getByTestId('selectable-timeline-mock-close'));

    expect(onClose).toHaveBeenCalled();
  });
});
