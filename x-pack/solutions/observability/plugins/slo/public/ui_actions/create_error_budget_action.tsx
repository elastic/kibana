/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { SLOPublicPluginsStart } from '..';
import {
  ADD_SLO_ERROR_BUDGET_ACTION_ID,
  SLO_ERROR_BUDGET_ID,
} from '../embeddable/slo/error_budget/constants';
import type { SLORepositoryClient } from '../types';
import { openSloConfiguration } from '../embeddable/slo/error_budget/error_budget_open_configuration';

export function createAddErrorBudgetPanelAction(
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SLO_ERROR_BUDGET_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 6,
    getIconType: () => 'visLine',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      try {
        const initialState = await openSloConfiguration(coreStart, pluginsStart, sloClient);
        embeddable.addNewPanel(
          {
            panelType: SLO_ERROR_BUDGET_ID,
            serializedState: initialState,
          },
          {
            displaySuccessMessage: true,
          }
        );
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.errorBudgetEmbeddable.ariaLabel', {
        defaultMessage: 'SLO Error Budget',
      }),
  };
}
