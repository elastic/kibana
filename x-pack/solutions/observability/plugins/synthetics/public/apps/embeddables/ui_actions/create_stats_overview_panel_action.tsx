/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { CoreStart } from '@kbn/core/public';
import type { ClientPluginsStart } from '../../../plugin';
import { ADD_SYNTHETICS_OVERVIEW_ACTION_ID } from './constants';
import { openMonitorConfiguration } from '../common/monitors_open_configuration';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../../../../common/embeddables/stats_overview/constants';

export function createStatusOverviewPanelAction(
  coreStart: CoreStart,
  pluginStart: ClientPluginsStart
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SYNTHETICS_OVERVIEW_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 5,
    getIconType: () => 'online',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      try {
        const initialState = await openMonitorConfiguration({
          coreStart,
          pluginStart,
          title: i18n.translate('xpack.synthetics.editSyntheticsOverviewEmbeddableTitle.title', {
            defaultMessage: 'Create monitor stats',
          }),
          type: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
        });
        embeddable.addNewPanel({
          panelType: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
          serializedState: initialState,
        });
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.synthetics.syntheticsEmbeddable.stats.ariaLabel', {
        defaultMessage: 'Monitors stats',
      }),
  };
}
