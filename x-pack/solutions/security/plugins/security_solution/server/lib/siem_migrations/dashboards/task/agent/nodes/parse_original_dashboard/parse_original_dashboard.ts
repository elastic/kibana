/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SplunkXmlDashboardParser } from '../../../../../../../../common/siem_migrations/parsers/splunk/dashboard_xml';
import type { GraphNode } from '../../types';

export const getParseOriginalDashboardNode = (): GraphNode => {
  return async (state) => {
    if (state.original_dashboard.vendor !== 'splunk') {
      throw new Error('Unsupported dashboard vendor');
    }

    const parser = new SplunkXmlDashboardParser(state.original_dashboard.data);
    const panels = await parser.extractPanels();

    return {
      parsed_original_dashboard: {
        title: state.original_dashboard.title,
        panels,
      },
    };
  };
};
