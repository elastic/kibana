/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import type {
  FlyoutActionType,
  FlyoutHeaderItem,
  FlyoutOrigin,
  FlyoutSessionKind,
  FlyoutTool,
  FlyoutType,
} from '../../../common/lib/telemetry';
import { FlyoutV2EventTypes } from '../../../common/lib/telemetry';

export type { FlyoutHeaderItem };

/** Metadata describing a top-level flyout open/close. */
export interface FlyoutOpenMeta {
  surface: 'flyout';
  flyoutType: FlyoutType;
  session: FlyoutSessionKind;
  /** Where the open action originated from, when known. */
  origin?: FlyoutOrigin;
}

/** Metadata describing a tool (child) flyout open/close. */
export interface ToolOpenMeta {
  surface: 'tool';
  tool: FlyoutTool;
  /** The parent flyout type, when known. */
  flyoutType?: FlyoutType;
  session: FlyoutSessionKind;
  /** Where the open action originated from, when known. */
  origin?: FlyoutOrigin;
}

/**
 * Describes what was opened/closed. Passed to `useOpenFlyout` and this hook so callers only
 * describe *what* happened — this hook is the only place that knows which EBT event that maps to.
 */
export type FlyoutTelemetryMeta = FlyoutOpenMeta | ToolOpenMeta;

export interface ReportActionClickedParams {
  flyoutType: FlyoutType;
  action: FlyoutActionType;
}

export interface ReportHeaderItemClickedParams {
  flyoutType: FlyoutType;
  item: FlyoutHeaderItem;
}

export interface UseFlyoutTelemetryResult {
  /** Reports that a flyout (or one of its tools) was opened. */
  reportOpened: (meta: FlyoutTelemetryMeta) => void;
  /** Reports that a flyout (or one of its tools) was closed, with how long it was open for. */
  reportClosed: (meta: FlyoutTelemetryMeta, durationMs: number) => void;
  /** Reports that a tab was clicked inside a flyout's main panel. */
  reportTabClicked: (params: { flyoutType: FlyoutType; tabId: string }) => void;
  /** Reports that an action was clicked, from the flyout header or the footer's take-action menu. */
  reportActionClicked: (params: ReportActionClickedParams) => void;
  /** Reports that a header control (assignees, status) was clicked to open its popover. */
  reportHeaderItemClicked: (params: ReportHeaderItemClickedParams) => void;
}

/**
 * Reports v2 flyout telemetry (`FlyoutV2EventTypes`) through the Security Solution EBT telemetry
 * service. This is the single place that translates an open/close/tab-click into the right event
 * type and payload shape, so call sites (the flyout API hooks, `useOpenFlyout`, `useTabs`, and the
 * handful of direct `openSystemFlyout` sites) only need to describe *what* happened.
 *
 * To add a new event: add it to `common/lib/telemetry/events/flyout_v2`, then add or extend a
 * reporter method here.
 */
export const useFlyoutTelemetry = (): UseFlyoutTelemetryResult => {
  const { telemetry } = useKibana().services;

  const reportOpened = useCallback(
    (meta: FlyoutTelemetryMeta) => {
      telemetry.reportEvent(FlyoutV2EventTypes.FlyoutOpened, {
        surface: meta.surface,
        flyoutType: meta.flyoutType,
        tool: meta.surface === 'tool' ? meta.tool : undefined,
        session: meta.session,
        origin: meta.origin,
      });
    },
    [telemetry]
  );

  const reportClosed = useCallback(
    (meta: FlyoutTelemetryMeta, durationMs: number) => {
      telemetry.reportEvent(FlyoutV2EventTypes.FlyoutClosed, {
        flyoutType: meta.flyoutType,
        tool: meta.surface === 'tool' ? meta.tool : undefined,
        session: meta.session,
        durationMs,
      });
    },
    [telemetry]
  );

  const reportTabClicked = useCallback(
    ({ flyoutType, tabId }: { flyoutType: FlyoutType; tabId: string }) => {
      telemetry.reportEvent(FlyoutV2EventTypes.FlyoutTabClicked, { flyoutType, tabId });
    },
    [telemetry]
  );

  const reportActionClicked = useCallback(
    (params: ReportActionClickedParams) => {
      telemetry.reportEvent(FlyoutV2EventTypes.FlyoutActionClicked, params);
    },
    [telemetry]
  );

  const reportHeaderItemClicked = useCallback(
    (params: ReportHeaderItemClickedParams) => {
      telemetry.reportEvent(FlyoutV2EventTypes.FlyoutHeaderItemClicked, params);
    },
    [telemetry]
  );

  return {
    reportOpened,
    reportClosed,
    reportTabClicked,
    reportActionClicked,
    reportHeaderItemClicked,
  };
};
