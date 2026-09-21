/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { SelectTimelineModal } from './select_timeline_modal';

jest.mock('../../../timelines/components/timeline/selectable_timeline', () => ({
  SelectableTimeline: ({
    onTimelineChange,
  }: {
    onTimelineChange: (title: string, id: string | null) => void;
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
    </div>
  ),
}));

describe('SelectTimelineModal', () => {
  it('wraps the body in an EuiModal and emits { savedObjectId, title } on pick', () => {
    const onSelect = jest.fn();
    render(<SelectTimelineModal onSelect={onSelect} onClose={jest.fn()} />);

    expect(screen.getByTestId('select-timeline-modal')).toBeInTheDocument();
    expect(screen.getByTestId('selectable-timeline-mock')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('selectable-timeline-mock-pick'));
    expect(onSelect).toHaveBeenCalledWith({ savedObjectId: 'so-id-1', title: 'Investigation' });
  });

  it('does not call onSelect when the picked timeline id is null', () => {
    const onSelect = jest.fn();
    render(<SelectTimelineModal onSelect={onSelect} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('selectable-timeline-mock-pick-null'));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
