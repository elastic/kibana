/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import { generateAssistantComment } from '../../../../../common/task/util/comments';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';

interface DashboardData {
  attributes: {
    title: string;
    panelsJSON: string;
  };
}

export const getAggregateDashboardNode = (): GraphNode => {
  return async (state) => {
    let dashboardData: DashboardData;
    try {
      dashboardData = readDashboardTemplate();
    } catch (error) {
      throw new Error(`Error loading dashboard template: ${error}`); // The dashboard migration status will be set to 'failed' and the error stored in the document
    }

    // Recover original order (the translated_panels is built asynchronously so the panels are in the order they complete the translation, not the original order)
    const panels = state.translated_panels.sort((a, b) => a.index - b.index);

    dashboardData.attributes.title = state.original_dashboard.title;
    dashboardData.attributes.panelsJSON = JSON.stringify(panels.map(({ data }) => data));

    let translationResult;
    if (panels.length > 0) {
      if (panels.length === state.parsed_original_dashboard.panels.length) {
        // Set to FULL only if all panels are fully translated
        const allFull = panels.every(
          (panel) => panel.translation_result === MigrationTranslationResult.FULL
        );
        translationResult = allFull
          ? MigrationTranslationResult.FULL
          : MigrationTranslationResult.PARTIAL;
      } else {
        translationResult = MigrationTranslationResult.PARTIAL;
      }
    } else {
      translationResult = MigrationTranslationResult.UNTRANSLATABLE;
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
        ...state.original_dashboard,
        data: JSON.stringify(dashboardData),
      },
      translation_result: translationResult,
      comments,
    };
  };
};

function readDashboardTemplate() {
  const templatePath = path.join(__dirname, `./dashboard.json`);
  const template = fs.readFileSync(templatePath, 'utf-8');
  if (!template) {
    throw new Error(`Dashboard template not found`);
  }
  return JSON.parse(template);
}
