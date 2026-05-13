/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/dashboard-plugin/server';
import { DEFAULT_DASHBOARD_OPTIONS } from '@kbn/dashboard-plugin/common/constants';
import { generateAssistantComment } from '../../../../../common/task/util/comments';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { GraphNode, TranslatedPanels } from '../../types';

function buildDashboardPanels(translatedPanels: TranslatedPanels): DashboardState['panels'] {
  return [...translatedPanels]
    .sort((a, b) => a.index - b.index)
    .filter((tp) => !tp.error)
    .map((tp) => tp.data);
}

export const getAggregateDashboardNode = (): GraphNode => {
  return async (state) => {
    const title = state.original_dashboard.title || 'Untitled Dashboard';
    const description = state.description || '';

    if (!state.translated_panels?.length) {
      return {
        elastic_dashboard: {
          title,
          description,
        },
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
        comments: [generateAssistantComment('No panels found')],
      };
    }

    const panels = state.translated_panels.sort((a, b) => a.index - b.index);

    const allErrors = panels.every((panel) => panel.error);
    if (allErrors) {
      throw new Error(
        `All panels failed to translate. Aborting dashboard generation. First error: ${panels[0].error}`
      );
    }

    const dashboardState: DashboardState = {
      title,
      description,
      options: { ...DEFAULT_DASHBOARD_OPTIONS },
      panels: buildDashboardPanels(panels),
      pinned_panels: [],
    };

    let translationResult: MigrationTranslationResult;

    const allTranslated = panels.every(
      (panel) => panel.translation_result === MigrationTranslationResult.FULL
    );
    if (allTranslated) {
      translationResult = MigrationTranslationResult.FULL;
    } else {
      const allUntranslatable = panels.every(
        (panel) => panel.translation_result === MigrationTranslationResult.UNTRANSLATABLE
      );
      if (allUntranslatable) {
        translationResult = MigrationTranslationResult.UNTRANSLATABLE;
      } else {
        translationResult = MigrationTranslationResult.PARTIAL;
      }
    }

    const comments = panels.flatMap((panel) => {
      if (panel.comments?.length) {
        return [generateAssistantComment(`# Panel "${panel.title}"`), ...panel.comments];
      }
      return [];
    });

    return {
      elastic_dashboard: {
        title,
        description,
        data: JSON.stringify(dashboardState),
      },
      translation_result: translationResult,
      comments,
    };
  };
};
