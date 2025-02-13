/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';

import { render, renderHook } from '@testing-library/react';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { mockTimelineModel, TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../../common/containers/use_full_screen';
import { useSessionView, useSessionViewNavigation } from './use_session_view';
import { TableId } from '@kbn/securitysolution-data-table';

const mockDispatch = jest.fn();
jest.mock('../../../../../common/hooks/use_selector');

jest.mock('../../../../../common/containers/use_full_screen');

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
          capabilities: {
            siemV2: { crud_alerts: true, read_alerts: true },
          },
        },
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
        },
        data: {
          search: jest.fn(),
          query: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
        timelines: {
          getLastUpdated: jest.fn(),
        },
      },
    }),
  };
});

describe('useSessionView with active timeline and a session id and graph event id', () => {
  let setTimelineFullScreen: jest.Mock;
  let setGlobalFullScreen: jest.Mock;
  let kibana: ReturnType<typeof useKibana>;
  const Wrapper = memo<PropsWithChildren<unknown>>(({ children }) => {
    kibana = useKibana();
    return <TestProviders>{children}</TestProviders>;
  });
  Wrapper.displayName = 'Wrapper';

  beforeEach(() => {
    setTimelineFullScreen = jest.fn();
    setGlobalFullScreen = jest.fn();
    (useTimelineFullScreen as jest.Mock).mockImplementation(() => ({
      setTimelineFullScreen,
    }));
    (useGlobalFullScreen as jest.Mock).mockImplementation(() => ({
      setGlobalFullScreen,
    }));
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => {
      return {
        ...mockTimelineModel,
        activeTab: TimelineTabs.session,
        graphEventId: 'current-graph-event-id',
        sessionViewConfig: {
          sessionEntityId: 'test',
        },
        show: true,
      };
    });
  });
  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  it('removes the full screen class from the overlay', () => {
    renderHook(
      () => {
        const testProps = {
          scopeId: TimelineId.active,
        };
        return useSessionView(testProps);
      },
      { wrapper: Wrapper }
    );
    expect(kibana.services.sessionView.getSessionView).toHaveBeenCalled();
  });

  it('calls setTimelineFullScreen with false when onCloseOverlay is called and the app is not in full screen mode', () => {
    const { result } = renderHook(
      () => {
        const testProps = {
          scopeId: TimelineId.active,
        };
        return useSessionViewNavigation(testProps);
      },
      { wrapper: Wrapper }
    );
    const navigation = result.current.Navigation;
    const renderResult = render(<TestProviders>{navigation}</TestProviders>);
    expect(renderResult.getByText('Close session viewer')).toBeTruthy();
  });

  it('uses an optional height when passed', () => {
    renderHook(
      () => {
        const testProps = {
          scopeId: TimelineId.test,
          height: 1118,
        };
        return useSessionView(testProps);
      },
      { wrapper: Wrapper }
    );
    expect(kibana.services.sessionView.getSessionView).toHaveBeenCalled();
  });

  describe('useSessionView with non active timeline and graph event id set', () => {
    beforeEach(() => {
      setTimelineFullScreen = jest.fn();
      setGlobalFullScreen = jest.fn();
      (useTimelineFullScreen as jest.Mock).mockImplementation(() => ({
        setTimelineFullScreen,
      }));
      (useGlobalFullScreen as jest.Mock).mockImplementation(() => ({
        setGlobalFullScreen,
      }));
      (useDeepEqualSelector as jest.Mock).mockImplementation(() => {
        return {
          ...mockTimelineModel,
          graphEventId: 'current-graph-event-id',
          sessionViewConfig: null,
          show: true,
        };
      });
    });
    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockClear();
    });
    it('renders the navigation component with the correct text for analyzer', () => {
      const { result } = renderHook(
        () => {
          const testProps = {
            scopeId: TableId.hostsPageEvents,
          };
          return useSessionViewNavigation(testProps);
        },
        { wrapper: Wrapper }
      );
      const navigation = result.current.Navigation;
      const renderResult = render(<TestProviders>{navigation}</TestProviders>);
      expect(renderResult.getByText('Close analyzer')).toBeTruthy();
    });
  });

  describe('useSessionView and useSessionViewNavigation should handle separate parts', () => {
    beforeEach(() => {
      setTimelineFullScreen = jest.fn();
      setGlobalFullScreen = jest.fn();
      (useTimelineFullScreen as jest.Mock).mockImplementation(() => ({
        setTimelineFullScreen,
      }));
      (useGlobalFullScreen as jest.Mock).mockImplementation(() => ({
        setGlobalFullScreen,
      }));
      (useDeepEqualSelector as jest.Mock).mockImplementation(() => {
        return {
          ...mockTimelineModel,
          activeTab: TimelineTabs.session,
          graphEventId: 'current-graph-event-id',
          sessionViewConfig: {
            sessionEntityId: 'test',
          },
          show: true,
        };
      });
    });
    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockClear();
    });
    it('useSessionView should handle session view and details panel', () => {
      const { result } = renderHook(
        () => {
          const testProps = {
            scopeId: TimelineId.active,
          };
          return useSessionView(testProps);
        },
        { wrapper: Wrapper }
      );
      expect(kibana.services.sessionView.getSessionView).toHaveBeenCalled();

      expect(result.current).toHaveProperty('openEventDetailsPanel');
      expect(result.current).toHaveProperty('SessionView');

      expect(result.current).not.toHaveProperty('Navigation');
      expect(result.current).not.toHaveProperty('onCloseOverlay');
    });

    it('useSessionViewNavigation should handle Navigation component and on close callback', () => {
      const { result } = renderHook(
        () => {
          const testProps = {
            scopeId: TableId.hostsPageEvents,
          };
          return useSessionViewNavigation(testProps);
        },
        { wrapper: Wrapper }
      );
      expect(result.current).toHaveProperty('Navigation');
      expect(result.current).toHaveProperty('onCloseOverlay');

      expect(result.current).not.toHaveProperty('openDetailsPanel');
      expect(result.current).not.toHaveProperty('shouldShowDetailsPanel');
      expect(result.current).not.toHaveProperty('SessionView');
      expect(result.current).not.toHaveProperty('DetailsPanel');
    });
  });
});
