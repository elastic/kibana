/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { SLOPublicPluginsStart } from '..';
import {
  ADD_SLO_OVERVIEW_ACTION_ID,
  SLO_OVERVIEW_EMBEDDABLE_ID,
} from '../embeddable/slo/overview/constants';
import { SLORepositoryClient } from '../types';
import { openSloConfiguration } from '../embeddable/slo/overview/slo_overview_open_configuration';

export function createOverviewPanelAction(
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SLO_OVERVIEW_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 20,
    getIconType: () => 'visGauge',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();

      try {
        const initialState = await openSloConfiguration(coreStart, pluginsStart, sloClient);
        embeddable.addNewPanel(
          {
            panelType: SLO_OVERVIEW_EMBEDDABLE_ID,
            initialState,
          },
          true
        );
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.sloEmbeddable.ariaLabel', {
        defaultMessage: 'SLO Overview',
      }),
  };
}
