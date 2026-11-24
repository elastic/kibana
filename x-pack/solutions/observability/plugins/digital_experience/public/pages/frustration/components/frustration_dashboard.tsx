/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { TimeRange } from '../../../hooks/use_time_range';
import type { FrustrationSessionSource } from '../utils/frustration_esql';
import type { FrustrationColors } from '../utils/frustration_panels';
import { buildFrustrationPanels } from '../utils/frustration_panels';

type FrustrationPanels = ReturnType<typeof buildFrustrationPanels>;

const LOAD_FAILURE_TITLE = i18n.translate('xpack.digitalExperience.frustration.loadFailureTitle', {
  defaultMessage: 'Could not load the frustration dashboard',
});

const savedTitleOf = (serviceName: string, environment: string | undefined): string =>
  environment
    ? i18n.translate('xpack.digitalExperience.frustration.savedTitleWithEnvironment', {
        defaultMessage: '{serviceName} ({environment}) frustration signals',
        values: { serviceName, environment },
      })
    : i18n.translate('xpack.digitalExperience.frustration.savedTitle', {
        defaultMessage: '{serviceName} frustration signals',
        values: { serviceName },
      });

const SAVED_DESCRIPTIONS: Record<FrustrationSessionSource, string> = {
  events: i18n.translate('xpack.digitalExperience.frustration.savedDescription', {
    defaultMessage: 'Rage, dead and error clicks reported by EDOT Browser.',
  }),
  // The saved panels keep reading the summaries whatever range the dashboard is opened with.
  summaries: i18n.translate('xpack.digitalExperience.frustration.savedDescriptionSummaries', {
    defaultMessage:
      'Rage, dead and error clicks reported by EDOT Browser. The per-session panels read the session summaries, so they have no sessions older than the summaries keep, and stop updating once sessions are turned off.',
  }),
};

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(`${error}`));

/** The panels of the service and environment, or the error that kept them from being built. */
const usePanels = (
  serviceName: string,
  environment: string,
  sessionSource: FrustrationSessionSource,
  colors: FrustrationColors
): { panels: FrustrationPanels } | { error: Error } => {
  const { rage, dead, error } = colors;

  return useMemo(() => {
    try {
      return {
        panels: buildFrustrationPanels(
          { serviceName, environment, sessionSource },
          { rage, dead, error }
        ),
      };
    } catch (buildError) {
      return { error: toError(buildError) };
    }
  }, [serviceName, environment, sessionSource, rage, dead, error]);
};

/**
 * The frustration panels of one application in a dashboard, which is mounted anew for another
 * service, environment or session source since their queries embed them.
 */
export function FrustrationDashboard({
  serviceName,
  environment,
  sessionSource,
  timeRange: { rangeFrom, rangeTo },
  refreshCount,
  onApiChange,
}: {
  serviceName: string;
  /** `undefined` for all environments. */
  environment: string | undefined;
  sessionSource: FrustrationSessionSource;
  timeRange: TimeRange;
  /** The dashboard refreshes each time this goes up. */
  refreshCount: number;
  /** Called with the dashboard's API once it loads, and with `undefined` when it goes away. */
  onApiChange?: (api: DashboardApi | undefined) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [dashboard, setDashboard] = useState<DashboardApi | undefined>();
  const handledRefreshCount = useRef(refreshCount);
  // The dashboard the published API belongs to: a late cleanup of a replaced one must not clear it.
  const publishedForRef = useRef<string | undefined>();

  const { danger, warning, accent } = euiTheme.colors;
  const result = usePanels(serviceName, environment ?? '', sessionSource, {
    rage: danger,
    dead: warning,
    error: accent,
  });
  const panels = 'panels' in result ? result.panels : undefined;
  const buildError = 'error' in result ? result.error : undefined;
  const dashboardKey = [
    serviceName,
    environment ?? '',
    sessionSource,
    danger,
    warning,
    accent,
  ].join('|');

  useEffect(() => {
    dashboard?.setTimeRange({ from: rangeFrom, to: rangeTo });
  }, [dashboard, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!dashboard || handledRefreshCount.current === refreshCount) {
      return;
    }
    handledRefreshCount.current = refreshCount;
    dashboard.forceRefresh();
  }, [dashboard, refreshCount]);

  const onApiAvailable = useCallback(
    (api: DashboardApi) => {
      // A dashboard without a saved object starts in edit mode whatever its initial input says.
      api.setViewMode('view');
      publishedForRef.current = dashboardKey;
      setDashboard(api);
      onApiChange?.(api);
    },
    [dashboardKey, onApiChange]
  );

  const onApiCleanup = useCallback(() => {
    if (publishedForRef.current === dashboardKey) {
      setDashboard(undefined);
      onApiChange?.(undefined);
    }
  }, [dashboardKey, onApiChange]);

  const getCreationOptions = useCallback(
    async (): Promise<DashboardCreationOptions> => ({
      useControlsIntegration: false,
      getInitialInput: () => ({
        panels,
        time_range: { from: rangeFrom, to: rangeTo },
        // The defaults of the save modal, which saves the panels as a dashboard.
        title: savedTitleOf(serviceName, environment),
        description: SAVED_DESCRIPTIONS[sessionSource],
      }),
    }),
    [panels, rangeFrom, rangeTo, serviceName, environment, sessionSource]
  );

  if (buildError || !panels) {
    return (
      <KbnDangerCallout
        announceOnMount
        title={LOAD_FAILURE_TITLE}
        text={buildError?.message}
        data-test-subj="digitalExperienceFrustrationDashboardError"
      />
    );
  }

  return (
    <DashboardRenderer
      key={dashboardKey}
      getCreationOptions={getCreationOptions}
      onApiAvailable={onApiAvailable}
      onApiCleanup={onApiCleanup}
    />
  );
}
