/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { mockTimelineData, mockTimelineModel, TestProviders } from '../../mock';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { licenseService } from '../../hooks/use_license';
import type { ActionsComponentProps } from './actions';
import { Actions } from './actions';
import { useIsInvestigateInResolverActionEnabled } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';

jest.mock('../../hooks/use_selector');
jest.mock('../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver');
jest.mock('../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => false),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const defaultProps: ActionsComponentProps = {
  ariaRowindex: 2,
  columnValues: 'abc def',
  disableExpandAction: false,
  disablePinAction: false,
  disableTimelineAction: false,
  ecsData: mockTimelineData[0].ecs,
  eventId: 'abc',
  eventIdToNoteIds: {},
  isEventViewer: false,
  onEventDetailsPanelOpened: jest.fn(),
  onRuleChange: jest.fn(),
  refetch: jest.fn(),
  showNotes: true,
  timelineId: 'test',
  toggleShowNotes: jest.fn(),
};

describe('Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useShallowEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

  describe('expand icon', () => {
    it('should render', () => {
      const { getByTestId } = render(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(getByTestId('expand-event')).toBeInTheDocument();
    });

    it('should not show expand icon if disableExpandAction is true', () => {
      const props = {
        ...defaultProps,
        disableExpandAction: true,
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('expand-event')).not.toBeInTheDocument();
    });
  });

  describe('investigate in Timeline icon', () => {
    it('should render', () => {
      const { getByTestId } = render(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(getByTestId('send-alert-to-timeline-button')).toBeInTheDocument();
    });

    it('should not show Timeline icon if disableTimelineAction is true', () => {
      const props = {
        ...defaultProps,
        disableTimelineAction: true,
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('send-alert-to-timeline-button')).not.toBeInTheDocument();
    });

    it('should not show Timeline icon if Timeline is active', () => {
      const props = {
        ...defaultProps,
        timelineId: 'timeline-1',
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('send-alert-to-timeline-button')).not.toBeInTheDocument();
    });
  });

  describe('note icon', () => {
    it('should render', () => {
      const { getByTestId } = render(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(getByTestId('timeline-notes-button-small')).toBeInTheDocument();
    });

    it('should not show note icon if showNotes is false', () => {
      const props = {
        ...defaultProps,
        showNotes: false,
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('timeline-notes-button-small')).not.toBeInTheDocument();
    });

    it('should not show note icon if isEventViewer is true', () => {
      const props = {
        ...defaultProps,
        isEventViewer: true,
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('timeline-notes-button-small')).not.toBeInTheDocument();
    });
  });

  describe('pin icon', () => {
    it('should render', () => {
      const { getByTestId } = render(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(getByTestId('timeline-pin-event-button')).toBeInTheDocument();
    });

    it('should not show pin icon if disablePinAction is true', () => {
      const props = {
        ...defaultProps,
        disablePinAction: true,
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('timeline-pin-event-button')).not.toBeInTheDocument();
    });

    it('should not show pin icon if isEventViewer is true', () => {
      const props = {
        ...defaultProps,
        isEventViewer: true,
      };
      const { queryByTestId } = render(
        <TestProviders>
          <Actions {...props} />
        </TestProviders>
      );

      expect(queryByTestId('timeline-pin-event-button')).not.toBeInTheDocument();
    });
  });

  describe('alert context menu', () => {
    describe('analyzer icon', () => {
      it('should render', () => {
        (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(true);

        const { getByTestId } = render(
          <TestProviders>
            <Actions {...defaultProps} />
          </TestProviders>
        );

        expect(getByTestId('view-in-analyzer')).toBeInTheDocument();
      });

      test('should not show analyzer icon', () => {
        (useIsInvestigateInResolverActionEnabled as jest.Mock).mockReturnValue(false);

        const { queryByTestId } = render(
          <TestProviders>
            <Actions {...defaultProps} />
          </TestProviders>
        );

        expect(queryByTestId('view-in-analyzer')).not.toBeInTheDocument();
      });
    });

    describe('session view icon', () => {
      it('should render', () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;
        licenseServiceMock.isEnterprise.mockReturnValue(true);

        const props = {
          ...defaultProps,
          ecsData: {
            ...mockTimelineData[0].ecs,
            event: { kind: ['alert'] },
            agent: { type: ['endpoint'] },
            process: {
              entry_leader: { entity_id: ['test_id'], start: ['2022-05-08T13:44:00.13Z'] },
            },
            _index: '.ds-logs-endpoint.events.process-default',
          },
        };

        const { getByTestId } = render(
          <TestProviders>
            <Actions {...props} />
          </TestProviders>
        );

        expect(getByTestId('session-view-button')).toBeInTheDocument();
      });

      it('should not show session view icon is no enterprise plus license', () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;
        licenseServiceMock.isEnterprise.mockReturnValue(false);

        const { queryByTestId } = render(
          <TestProviders>
            <Actions {...defaultProps} />
          </TestProviders>
        );

        expect(queryByTestId('session-view-button')).not.toBeInTheDocument();
      });

      it('should not show session view icon if no session view config', () => {
        const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;
        licenseServiceMock.isEnterprise.mockReturnValue(true);

        const { queryByTestId } = render(
          <TestProviders>
            <Actions {...defaultProps} />
          </TestProviders>
        );

        expect(queryByTestId('session-view-button')).not.toBeInTheDocument();
      });
    });
  });
});
