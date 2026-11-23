/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditTimelineActionsComponent } from '.';

jest.mock('./export_timeline', () => ({
  TimelineDownloader: (props: { 'data-test-subj'?: string }) => (
    <div data-test-subj={props['data-test-subj']} />
  ),
}));

jest.mock('../delete_timeline_modal', () => ({
  DeleteTimelineModalOverlay: (props: { 'data-test-subj'?: string }) => (
    <div data-test-subj={props['data-test-subj']} />
  ),
}));

describe('EditTimelineActionsComponent', () => {
  describe('render', () => {
    const props = {
      deleteTimelines: jest.fn(),
      ids: ['id1'],
      isEnableDownloader: false,
      isDeleteTimelineModalOpen: false,
      onComplete: jest.fn(),
      title: 'mockTitle',
    };

    test('should render timelineDownloader', () => {
      render(<EditTimelineActionsComponent {...props} />);

      expect(screen.getByTestId('TimelineDownloader')).toBeInTheDocument();
    });

    test('Should render DeleteTimelineModalOverlay if deleteTimelines is given', () => {
      render(<EditTimelineActionsComponent {...props} />);

      expect(screen.getByTestId('DeleteTimelineModalOverlay')).toBeInTheDocument();
    });

    test('Should not render DeleteTimelineModalOverlay if deleteTimelines is not given', () => {
      const newProps = {
        ...props,
        deleteTimelines: undefined,
      };
      render(<EditTimelineActionsComponent {...newProps} />);
      expect(screen.queryByTestId('DeleteTimelineModalOverlay')).not.toBeInTheDocument();
    });
  });
});
