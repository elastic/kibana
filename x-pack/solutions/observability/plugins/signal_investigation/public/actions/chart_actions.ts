/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractTimeRange, type Filter, type TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { MAX_INVESTIGATION_FIELD_CHARS, type InvestigationSeed } from '@kbn/investigation-seed';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { isLensApi, type LensApi, type LensPublicStart } from '@kbn/lens-plugin/public';
import {
  apiHasParentApi,
  apiIsOfType,
  getTitle,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import { firstValueFrom } from 'rxjs';
import type { OpenInvestigationOptions } from '../plugin';
import { reportSignalInvestigationShown } from '../telemetry/shown_telemetry';
import { extractLensChartSeed } from './lens_seed_extractor';

export const FIND_RELATED_CHANGES_PANEL_ACTION_ID = 'signal-investigation-panel-action';
export const FIND_RELATED_CHANGES_CHART_ACTION_ID = 'signal-investigation-chart-action';

export interface ChartActionDeps {
  chartActionEnabled: boolean;
  isCompatibleSpace: () => boolean;
  getCurrentAppId: () => string | undefined;
  getServices: () => Promise<{
    lens: LensPublicStart;
    licensing: LicensingPluginStart;
    openInvestigation: (options: OpenInvestigationOptions) => Promise<void>;
  }>;
}

/** Panel APIs that have already reported `shown`. A remounted panel is a new object and counts again. */
const reportedPanelInstances = new WeakSet<object>();

const findRelatedChangesDisplayName = (): string =>
  i18n.translate('xpack.signalInvestigation.actions.findRelatedChanges', {
    defaultMessage: 'Find related changes',
  });

const hasPlatinumLicense = async (licensing: LicensingPluginStart): Promise<boolean> => {
  try {
    const license = await firstValueFrom(licensing.license$);
    return Boolean(license?.hasAtLeast('platinum'));
  } catch {
    return false;
  }
};

const boundedPanelTitle = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > MAX_INVESTIGATION_FIELD_CHARS) {
    return undefined;
  }
  return trimmed;
};

/** Returns the investigation origin for a dashboard Lens panel or the Discover histogram. */
export const resolveChartOrigin = ({
  embeddable,
  currentAppId,
}: {
  embeddable: LensApi;
  currentAppId: string | undefined;
}): InvestigationSeed['origin'] | undefined => {
  if (apiHasParentApi(embeddable) && apiIsOfType(embeddable.parentApi, 'dashboard')) {
    const panelTitle = boundedPanelTitle(getTitle(embeddable) ?? embeddable.title$?.getValue());
    return {
      app: 'dashboard',
      ...(panelTitle ? { panelTitle } : {}),
    };
  }
  if (currentAppId === 'discover') {
    return { app: 'discover', surface: 'histogram' };
  }
  return undefined;
};

const hasEmbeddableTimeRange = (embeddable: LensApi): boolean => {
  const ownRange = embeddable.timeRange$?.getValue();
  if (ownRange?.from && ownRange?.to) {
    return true;
  }
  const parent = embeddable.parentApi as
    | { timeRange$?: { getValue: () => TimeRange | undefined } }
    | null
    | undefined;
  const parentRange = parent?.timeRange$?.getValue();
  return Boolean(parentRange?.from && parentRange?.to);
};

/** Checks whether an `ON_APPLY_FILTER` event is compatible with the chart action. */
export const isChartFilterActionCompatible = ({
  chartActionEnabled,
  isCompatibleSpace,
  currentAppId,
  context,
}: {
  chartActionEnabled: boolean;
  isCompatibleSpace: boolean;
  currentAppId: string | undefined;
  context: ApplyGlobalFilterActionContext;
}):
  | { compatible: false }
  | {
      compatible: true;
      timeRange: TimeRange;
      restOfFilters: Filter[];
      origin: InvestigationSeed['origin'];
    } => {
  if (!chartActionEnabled || !isCompatibleSpace) {
    return { compatible: false };
  }
  if (!isLensApi(context.embeddable)) {
    return { compatible: false };
  }
  const origin = resolveChartOrigin({ embeddable: context.embeddable, currentAppId });
  if (!origin) {
    return { compatible: false };
  }
  const { timeRange, restOfFilters } = extractTimeRange(
    context.filters ?? [],
    context.timeFieldName
  );
  if (!timeRange?.from || !timeRange?.to) {
    return { compatible: false };
  }
  return { compatible: true, timeRange, restOfFilters, origin };
};

/** Panel context-menu action on `ON_OPEN_PANEL_MENU` for Lens panels. */
export const createFindRelatedChangesPanelAction = (
  deps: ChartActionDeps
): UiActionsActionDefinition<EmbeddableApiContext> => ({
  id: FIND_RELATED_CHANGES_PANEL_ACTION_ID,
  type: FIND_RELATED_CHANGES_PANEL_ACTION_ID,
  order: 210,
  getIconType: () => 'magnify',
  getDisplayName: findRelatedChangesDisplayName,
  isCompatible: async ({ embeddable }) => {
    if (!deps.isCompatibleSpace() || !isLensApi(embeddable)) {
      return false;
    }
    const origin = resolveChartOrigin({ embeddable, currentAppId: deps.getCurrentAppId() });
    if (!origin) {
      return false;
    }
    if (!hasEmbeddableTimeRange(embeddable)) {
      return false;
    }
    const { licensing } = await deps.getServices();
    const compatible = await hasPlatinumLicense(licensing);
    if (compatible && !reportedPanelInstances.has(embeddable)) {
      reportedPanelInstances.add(embeddable);
      reportSignalInvestigationShown({ app: origin.app, surface: 'panelMenu' });
    }
    return compatible;
  },
  execute: async ({ embeddable }) => {
    if (!isLensApi(embeddable)) {
      return;
    }
    const origin = resolveChartOrigin({ embeddable, currentAppId: deps.getCurrentAppId() });
    if (!origin) {
      return;
    }
    const { lens, openInvestigation } = await deps.getServices();
    const extracted = await extractLensChartSeed({ embeddable, lens, origin });
    if (!extracted) {
      return;
    }
    await openInvestigation({
      seed: extracted.seed,
      session: 'start',
      metricOptions: extracted.metrics,
      metricUnreadable: extracted.metricUnreadable,
    });
  },
});

/** Flag-gated chart brush/click action on `ON_APPLY_FILTER`. */
export const createFindRelatedChangesChartAction = (
  deps: ChartActionDeps
): UiActionsActionDefinition<ApplyGlobalFilterActionContext> => ({
  id: FIND_RELATED_CHANGES_CHART_ACTION_ID,
  type: FIND_RELATED_CHANGES_CHART_ACTION_ID,
  order: 210,
  getIconType: () => 'magnify',
  getDisplayName: findRelatedChangesDisplayName,
  isCompatible: async (context) => {
    const check = isChartFilterActionCompatible({
      chartActionEnabled: deps.chartActionEnabled,
      isCompatibleSpace: deps.isCompatibleSpace(),
      currentAppId: deps.getCurrentAppId(),
      context,
    });
    if (!check.compatible) {
      return false;
    }
    const { licensing } = await deps.getServices();
    const compatible = await hasPlatinumLicense(licensing);
    if (compatible) {
      reportSignalInvestigationShown({
        app: check.origin.app,
        surface: check.origin.app === 'discover' ? 'histogram' : 'chartBrush',
      });
    }
    return compatible;
  },
  execute: async (context) => {
    const check = isChartFilterActionCompatible({
      chartActionEnabled: deps.chartActionEnabled,
      isCompatibleSpace: deps.isCompatibleSpace(),
      currentAppId: deps.getCurrentAppId(),
      context,
    });
    if (!check.compatible || !isLensApi(context.embeddable)) {
      return;
    }
    const { lens, openInvestigation } = await deps.getServices();
    const extracted = await extractLensChartSeed({
      embeddable: context.embeddable,
      lens,
      origin: check.origin,
      eventTimeRange: check.timeRange,
      eventFilters: check.restOfFilters,
    });
    if (!extracted) {
      return;
    }
    await openInvestigation({
      seed: extracted.seed,
      session: 'start',
      metricOptions: extracted.metrics,
      metricUnreadable: extracted.metricUnreadable,
    });
  },
});
