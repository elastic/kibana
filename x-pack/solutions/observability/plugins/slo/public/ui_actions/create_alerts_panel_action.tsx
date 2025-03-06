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
  ADD_SLO_ALERTS_ACTION_ID,
  SLO_ALERTS_EMBEDDABLE_ID,
} from '../embeddable/slo/alerts/constants';
import { SLORepositoryClient } from '../types';
import { openSloConfiguration } from '../embeddable/slo/alerts/slo_alerts_open_configuration';

export function createAddAlertsPanelAction(
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SLO_ALERTS_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    getIconType: () => 'alert',
    order: 10,
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();

      try {
        const initialState = await openSloConfiguration(coreStart, pluginsStart, sloClient);
        embeddable.addNewPanel(
          {
            panelType: SLO_ALERTS_EMBEDDABLE_ID,
            initialState,
          },
          true
        );
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.sloAlertsEmbeddable.displayName', {
        defaultMessage: 'SLO Alerts',
      }),
  };
}
