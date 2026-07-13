/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFlyoutTelemetry } from './use_flyout_telemetry';
import { useKibana } from '../../../common/lib/kibana';
import { FlyoutV2EventTypes } from '../../../common/lib/telemetry';

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
        surface: 'flyout',
        flyoutType: 'document',
        session: 'start',
        origin: 'alerts_table',
      });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: 'flyout',
        flyoutType: 'document',
        tool: undefined,
        session: 'start',
        origin: 'alerts_table',
      });
    });

    it('reports FlyoutOpened without an origin when none is given', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({ surface: 'flyout', flyoutType: 'host', session: 'inherit' });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: 'flyout',
        flyoutType: 'host',
        tool: undefined,
        session: 'inherit',
        origin: undefined,
      });
    });

    it('reports FlyoutOpened with surface "tool" for a tool surface', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({
        surface: 'tool',
        tool: 'analyzer',
        flyoutType: 'document',
        session: 'start',
      });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: 'tool',
        tool: 'analyzer',
        flyoutType: 'document',
        session: 'start',
        origin: undefined,
      });
    });

    it('reports FlyoutOpened without a flyoutType when the parent is unknown', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportOpened({ surface: 'tool', tool: 'graph_view', session: 'inherit' });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
        surface: 'tool',
        tool: 'graph_view',
        flyoutType: undefined,
        session: 'inherit',
        origin: undefined,
      });
    });
  });

  describe('reportClosed', () => {
    it('reports FlyoutClosed with the flyout type and duration, no tool', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportClosed(
        { surface: 'flyout', flyoutType: 'attack', session: 'start' },
        1234
      );

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutClosed, {
        flyoutType: 'attack',
        tool: undefined,
        session: 'start',
        durationMs: 1234,
      });
    });

    it('reports FlyoutClosed with the tool for a tool surface', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportClosed(
        { surface: 'tool', tool: 'session_view', flyoutType: 'document', session: 'start' },
        42
      );

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutClosed, {
        flyoutType: 'document',
        tool: 'session_view',
        session: 'start',
        durationMs: 42,
      });
    });
  });

  describe('reportTabClicked', () => {
    it('reports FlyoutTabClicked with the flyout type and tab id', () => {
      const { result } = renderHook(() => useFlyoutTelemetry());

      result.current.reportTabClicked({ flyoutType: 'ioc', tabId: 'table' });

      expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutTabClicked, {
        flyoutType: 'ioc',
        tabId: 'table',
      });
    });
  });
});
