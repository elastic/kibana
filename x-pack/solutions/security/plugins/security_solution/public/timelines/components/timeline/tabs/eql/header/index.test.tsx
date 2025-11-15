/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import type { EqlTabHeaderProps } from '.';
import { EqlTabHeader } from '.';
import { TimelineId, TimelineTabs } from '../../../../../../../common/types';
import { DATA_VIEW_PICKER_TEST_ID } from '../../../../../../data_view_manager/components/data_view_picker/constants';

describe('Eql Header', () => {
  const props = {
    activeTab: TimelineTabs.eql,
    timelineId: TimelineId.test,
    timelineFullScreen: false,
    setTimelineFullScreen: jest.fn(),
  } as EqlTabHeaderProps;

  describe('rendering', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <EqlTabHeader {...props} />
        </TestProviders>
      );
    });

    test('should components', async () => {
      expect(screen.getByTestId('EqlQueryBarTimeline')).toBeInTheDocument();
      expect(screen.getByTestId(DATA_VIEW_PICKER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('superDatePickerToggleQuickMenuButton')).toBeInTheDocument();
    });
  });

  describe('full screen', () => {
    beforeEach(() => {
      const updatedProps = {
        ...props,
        timelineFullScreen: true,
      } as EqlTabHeaderProps;

      render(
        <TestProviders>
          <EqlTabHeader {...updatedProps} />
        </TestProviders>
      );
    });

    test('should render the exit full screen component', async () => {
      expect(screen.getByTestId('exit-full-screen')).toBeInTheDocument();
    });
  });
});
