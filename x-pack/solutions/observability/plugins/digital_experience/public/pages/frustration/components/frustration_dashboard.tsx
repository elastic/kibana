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
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import type { TimeRange } from '../../../hooks/use_time_range';
import type { FrustrationColors } from '../utils/frustration_panels';
import { buildFrustrationPanels } from '../utils/frustration_panels';

type FrustrationPanels = ReturnType<typeof buildFrustrationPanels>;

const LOAD_FAILURE_TITLE = i18n.translate('xpack.digitalExperience.frustration.loadFailureTitle', {
  defaultMessage: 'Could not load the frustration dashboard',
});

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(`${error}`));

/** The panels of the service and environment, or the error that kept them from being built. */
const usePanels = (
  serviceName: string,
  environment: string,
  colors: FrustrationColors
): { panels: FrustrationPanels } | { error: Error } => {
  const { rage, dead, error } = colors;

  return useMemo(() => {
    try {
      return {
        panels: buildFrustrationPanels({ serviceName, environment }, { rage, dead, error }),
      };
    } catch (buildError) {
      return { error: toError(buildError) };
    }
  }, [serviceName, environment, rage, dead, error]);
};

/**
 * The frustration panels of one application in a dashboard, which is mounted anew for another
 * service or environment since their queries embed them.
 */
export function FrustrationDashboard({
  serviceName,
  environment,
  timeRange: { rangeFrom, rangeTo },
  refreshCount,
}: {
  serviceName: string;
  /** `undefined` for all environments. */
  environment: string | undefined;
  timeRange: TimeRange;
  /** The dashboard refreshes each time this goes up. */
  refreshCount: number;
}) {
  const { euiTheme } = useEuiTheme();
  const {
    notifications: { toasts },
  } = useKibanaServices();
  const [dashboard, setDashboard] = useState<DashboardApi | undefined>();
  const handledRefreshCount = useRef(refreshCount);
  // The dashboard the published API belongs to: a late cleanup of a replaced one must not clear it.
  const publishedForRef = useRef<string | undefined>();

  const { danger, warning, accent } = euiTheme.colors;
  const result = usePanels(serviceName, environment ?? '', {
    rage: danger,
    dead: warning,
    error: accent,
  });
  const panels = 'panels' in result ? result.panels : undefined;
  const buildError = 'error' in result ? result.error : undefined;
  const dashboardKey = `${serviceName}|${environment ?? ''}|${danger}|${warning}|${accent}`;

  useEffect(() => {
    if (buildError) {
      toasts.addDanger({ title: LOAD_FAILURE_TITLE, text: buildError.message });
    }
  }, [buildError, toasts]);

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
    },
    [dashboardKey]
  );

  const onApiCleanup = useCallback(() => {
    if (publishedForRef.current === dashboardKey) {
      setDashboard(undefined);
    }
  }, [dashboardKey]);

  const getCreationOptions = useCallback(
    async (): Promise<DashboardCreationOptions> => ({
      getInitialInput: () => ({
        panels,
        time_range: { from: rangeFrom, to: rangeTo },
      }),
    }),
    [panels, rangeFrom, rangeTo]
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
