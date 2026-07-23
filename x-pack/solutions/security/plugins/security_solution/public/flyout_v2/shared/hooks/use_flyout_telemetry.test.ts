/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFlyoutTelemetry } from './use_flyout_telemetry';
import { useKibana } from '../../../common/lib/kibana';
import {
  FlyoutV2EventTypes,
  FLYOUT_ORIGIN,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
  FLYOUT_TOOL,
  FLYOUT_SESSION_KIND,
} from '../../../common/lib/telemetry';

jest.mock('../../../common/lib/kibana');

const mockReportEvent = jest.fn();

describe('useFlyoutTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { telemetry: { reportEvent: mockReportEvent } },
    });
  });

  describe('reportOpened', () => {
    it('reports FlyoutOpened for a flyout surface', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        session: FLYOUT_SESSION_KIND.START,
        origin: FLYOUT_ORIGIN.ALERTS_TABLE,
      });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        tool: undefined,
        session: FLYOUT_SESSION_KIND.START,
        origin: FLYOUT_ORIGIN.ALERTS_TABLE,
      });
    });

    it('reports FlyoutOpened without an origin when none is given', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.HOST,
        session: FLYOUT_SESSION_KIND.INHERIT,
      });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.HOST,
        tool: undefined,
        session: FLYOUT_SESSION_KIND.INHERIT,
        origin: undefined,
      });
    });

    it('reports FlyoutOpened with surface "tool" for a tool surface', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({
        surface: FLYOUT_SURFACE.TOOL,
        tool: FLYOUT_TOOL.ANALYZER,
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        session: FLYOUT_SESSION_KIND.START,
      });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: FLYOUT_SURFACE.TOOL,
        tool: FLYOUT_TOOL.ANALYZER,
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        session: FLYOUT_SESSION_KIND.START,
        origin: undefined,
      });
    });

    it('reports FlyoutOpened without a flyoutType when the parent is unknown', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({
        surface: FLYOUT_SURFACE.TOOL,
        tool: FLYOUT_TOOL.GRAPH_VIEW,
        session: FLYOUT_SESSION_KIND.INHERIT,
      });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: FLYOUT_SURFACE.TOOL,
        tool: FLYOUT_TOOL.GRAPH_VIEW,
        flyoutType: undefined,
        session: FLYOUT_SESSION_KIND.INHERIT,
        origin: undefined,
      });
    });
  });

  describe('reportClosed', () => {
    it('reports FlyoutClosed with the flyout type and duration, no tool', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportClosed(
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.ATTACK,
          session: FLYOUT_SESSION_KIND.START,
        },
        1234
      );

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutClosed, {
        flyoutType: FLYOUT_TYPE.ATTACK,
        tool: undefined,
        session: FLYOUT_SESSION_KIND.START,
        durationMs: 1234,
      });
    });

    it('reports FlyoutClosed with the tool for a tool surface', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportClosed(
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.SESSION_VIEW,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
        },
        42
      );

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutClosed, {
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        tool: FLYOUT_TOOL.SESSION_VIEW,
        session: FLYOUT_SESSION_KIND.START,
        durationMs: 42,
      });
    });
  });

  describe('reportTabClicked', () => {
    it('reports FlyoutTabClicked with the flyout type and tab id', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportTabClicked({ flyoutType: FLYOUT_TYPE.IOC, tabId: 'table' });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutTabClicked, {
        flyoutType: FLYOUT_TYPE.IOC,
        tabId: 'table',
      });
    });
  });
});
