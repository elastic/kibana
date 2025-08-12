/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { GraphNode } from '../../types';

export const getAggregateDashboardNode = (): GraphNode => {
  return async (state) => {
    // dashboard data is the SO data ready to be installed
    // TODO: use the templates (viz_type) to generate the correct dashboardData, this is still dummy data
    const dashboardData = state.translated_panels
      .sort((a, b) => a.index - b.index)
      .map(({ panel }) => ({
        title: panel.title,
        description: panel.description,
        query: panel.query,
        // id
        // position
        // viz_type
      }));

    // TODO: Consider adding individual translation results for each panel, and aggregate them here
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
