/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/public';
import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { AlertsEmbeddableState } from '../server/lib/embeddables/alerts_schema';
import { SLO_ALERTS_EMBEDDABLE_ID } from '../common/embeddables/alerts/constants';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from './embeddable/slo/burn_rate/constants';
import { SLO_ERROR_BUDGET_ID } from './embeddable/slo/error_budget/constants';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../common/embeddables/overview/constants';
import type { OverviewEmbeddableState } from '../common/embeddables/overview/types';
import { registerSloUiActions } from './ui_actions/register_ui_actions';
import type { SLOPublicPluginsSetup, SLOPublicPluginsStart, SLORepositoryClient } from './types';

export interface RegisterEmbeddablesDeps {
  core: CoreSetup<SLOPublicPluginsStart>;
  plugins: SLOPublicPluginsSetup;
  sloClient: SLORepositoryClient;
  kibanaVersion: string;
}

export const registerEmbeddables = ({
  core,
  plugins,
  sloClient,
  kibanaVersion,
<<<<<<< HEAD
}: RegisterEmbeddablesDeps) => {
  plugins.embeddable.registerEmbeddablePublicDefinition(SLO_OVERVIEW_EMBEDDABLE_ID, async () => {
    const [{ getOverviewEmbeddableFactory }, [coreStart, pluginsStart]] = await Promise.all([
      import('./embeddable/slo/overview/slo_embeddable_factory'),
      core.getStartServices(),
    ]);
    return getOverviewEmbeddableFactory({ coreStart, pluginsStart, sloClient });
  });
  plugins.embeddable.registerLegacyURLTransform(
    SLO_OVERVIEW_EMBEDDABLE_ID,
    async (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
      const { getTransformOut } = await import(
        '../common/embeddables/overview/transforms/get_transform_out'
=======
}: RegisterEmbeddablesDeps): Promise<void> => {
  const licensing = plugins.licensing;
  const license = await firstValueFrom(licensing.license$);

  const hasPlatinumLicense = license.hasAtLeast('platinum');
  if (hasPlatinumLicense) {
    const [coreStart, pluginsStart] = await core.getStartServices();

    pluginsStart.presentationUtil.registerPanelPlacementSettings(
      SLO_OVERVIEW_EMBEDDABLE_ID,
      (serializedState?: OverviewEmbeddableState) => {
        if (
          (serializedState as SingleOverviewCustomState)?.slo_instance_id === ALL_VALUE ||
          (serializedState as GroupOverviewCustomState)?.group_filters
        ) {
          return { placementSettings: { width: 24, height: 8 } };
        }
        return { placementSettings: { width: 12, height: 8 } };
      }
    );
    pluginsStart.presentationUtil.registerPanelPlacementSettings(
      SLO_BURN_RATE_EMBEDDABLE_ID,
      () => {
        return { placementSettings: { width: 14, height: 7 } };
      }
    );

    plugins.embeddable.registerEmbeddablePublicDefinition(SLO_OVERVIEW_EMBEDDABLE_ID, async () => {
      const { getOverviewEmbeddableFactory } = await import(
        './embeddable/slo/overview/slo_embeddable_factory'
>>>>>>> 9.4
      );
      const transformOut = getTransformOut(transformDrilldownsOut);
      return (
        storedState: object,
        panelReferences?: Reference[],
        containerReferences?: Reference[],
        id?: string
      ) => transformOut(storedState as OverviewEmbeddableState, panelReferences);
    }
  );

<<<<<<< HEAD
  plugins.embeddable.registerEmbeddablePublicDefinition(SLO_ALERTS_EMBEDDABLE_ID, async () => {
    const [{ getAlertsEmbeddableFactory }, [coreStart, pluginsStart]] = await Promise.all([
      import('./embeddable/slo/alerts/slo_alerts_embeddable_factory'),
      core.getStartServices(),
    ]);

    return getAlertsEmbeddableFactory({ coreStart, pluginsStart, sloClient, kibanaVersion });
  });
  plugins.embeddable.registerLegacyURLTransform(
    SLO_ALERTS_EMBEDDABLE_ID,
    async (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
      const { getTransformOut } = await import(
        '../common/embeddables/alerts/transforms/get_transform_out'
=======
    plugins.embeddable.registerEmbeddablePublicDefinition(SLO_ALERTS_EMBEDDABLE_ID, async () => {
      const { getAlertsEmbeddableFactory } = await import(
        './embeddable/slo/alerts/slo_alerts_embeddable_factory'
>>>>>>> 9.4
      );
      const transformOut = getTransformOut(transformDrilldownsOut);
      return (
        storedState: object,
        panelReferences?: Reference[],
        containerReferences?: Reference[],
        id?: string
      ) => transformOut(storedState as AlertsEmbeddableState, panelReferences);
    }
  );

  plugins.embeddable.registerEmbeddablePublicDefinition(SLO_ERROR_BUDGET_ID, async () => {
    const [{ getErrorBudgetEmbeddableFactory }, [coreStart, pluginsStart]] = await Promise.all([
      import('./embeddable/slo/error_budget/error_budget_react_embeddable_factory'),
      core.getStartServices(),
    ]);
    return getErrorBudgetEmbeddableFactory({
      coreStart,
      pluginsStart,
      sloClient,
    });
  });

<<<<<<< HEAD
  plugins.embeddable.registerEmbeddablePublicDefinition(SLO_BURN_RATE_EMBEDDABLE_ID, async () => {
    const [{ getBurnRateEmbeddableFactory }, [coreStart, pluginsStart]] = await Promise.all([
      import('./embeddable/slo/burn_rate/burn_rate_react_embeddable_factory'),
      core.getStartServices(),
    ]);
    return getBurnRateEmbeddableFactory({
      coreStart,
      pluginsStart,
      sloClient,
=======
    plugins.embeddable.registerEmbeddablePublicDefinition(SLO_ERROR_BUDGET_ID, async () => {
      const { getErrorBudgetEmbeddableFactory } = await import(
        './embeddable/slo/error_budget/error_budget_react_embeddable_factory'
      );
      return getErrorBudgetEmbeddableFactory({
        coreStart,
        pluginsStart,
        sloClient,
      });
>>>>>>> 9.4
    });
  });

<<<<<<< HEAD
  registerSloUiActions(plugins.uiActions, core, sloClient);
=======
    plugins.embeddable.registerEmbeddablePublicDefinition(SLO_BURN_RATE_EMBEDDABLE_ID, async () => {
      const { getBurnRateEmbeddableFactory } = await import(
        './embeddable/slo/burn_rate/burn_rate_react_embeddable_factory'
      );
      return getBurnRateEmbeddableFactory({
        coreStart,
        pluginsStart,
        sloClient,
      });
    });

    registerSloUiActions(plugins.uiActions, coreStart, pluginsStart, sloClient);
  }
>>>>>>> 9.4
};
