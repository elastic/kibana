/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateAssistantComment } from '../../../../../common/task/util/comments';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';
import dashboardTemplate from './dashboard.json';

interface DashboardData {
  attributes: {
    title: string;
    description: string;
    panelsJSON: string;
  };
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

    // Recover original order (the translated_panels is built asynchronously so the panels are in the order they complete the translation, not the original order)
    const panels = state.translated_panels.sort((a, b) => a.index - b.index);

    const allErrors = panels.every((panel) => panel.error);
    if (allErrors) {
      // The dashboard migration status will be set to 'failed' and the error stored in the document.
      throw new Error(
        `All panels failed to translate. Aborting dashboard generation. First error: ${panels[0].error}` // Only show the first error to avoid overly long error messages
      );
    }

    // Create the dashboard object
    const dashboardData: DashboardData = structuredClone(dashboardTemplate);
    dashboardData.attributes.title = title;
    dashboardData.attributes.description = description;
    dashboardData.attributes.panelsJSON = JSON.stringify(panels.map(({ data }) => data));

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

    // Aggregate all comments from the individual panel translations, with a header for each panel
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
        data: JSON.stringify(dashboardData),
      },
      translation_result: translationResult,
      comments,
    };
  };
};
