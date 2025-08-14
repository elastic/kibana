/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
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
      const templatePath = path.join(__dirname, `./dashboard.json`);
      const template = fs.readFileSync(templatePath, 'utf-8');

      if (!template) {
        throw new Error(`Dashboard template not found`);
      }
      dashboardData = JSON.parse(template);
    } catch (error) {
      // TODO: log the error
      return {
        // TODO: add comment: "panel chart type not supported"
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      };
    }

    const panels = state.translated_panels.sort((a, b) => a.index - b.index);

    dashboardData.attributes.title = state.original_dashboard.title;
    dashboardData.attributes.panelsJSON = JSON.stringify(panels.map(({ data }) => data));

    // TODO: Use individual translation results for each panel:
    // panels.map((panel) => panel.translation_result)
    // and aggregate the top level translation_result here
    let translationResult;
    if (state.translated_panels.length > 0) {
      if (state.translated_panels.length > 0) {
        translationResult = MigrationTranslationResult.PARTIAL;
      } else {
        translationResult = MigrationTranslationResult.FULL;
      }
    } else {
      translationResult = MigrationTranslationResult.UNTRANSLATABLE;
    }

    return {
      elastic_dashboard: {
        title: state.original_dashboard.title,
        data: JSON.stringify(dashboardData),
      },
      translation_result: translationResult,
    };
  };
};
