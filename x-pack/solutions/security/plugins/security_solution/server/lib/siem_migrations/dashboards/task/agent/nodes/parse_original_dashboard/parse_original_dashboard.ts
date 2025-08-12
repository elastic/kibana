/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { ChartPanel } from '../../../../lib/parsers/splunk/splunk_xml_dashboard_parser';
import { SplunkXmlDashboardParser } from '../../../../lib/parsers/splunk/splunk_xml_dashboard_parser';
import type { VizType, GraphNode, PanelPosition } from '../../types';

export const getParseOriginalDashboardNode = (): GraphNode => {
  return async (state) => {
    if (state.original_dashboard.vendor !== 'splunk') {
      throw new Error('Unsupported dashboard vendor');
    }

    const parser = new SplunkXmlDashboardParser(state.original_dashboard.data);
    const parsedDashboard = await parser.toObject();

    const panels =
      parsedDashboard.dashboard?.row?.flatMap(
        (row) =>
          row.panel?.map((panel) => ({
            id: uuidV4(),
            title: panel?.title?.[0] ?? '',
            description: panel?.description?.[0] ?? '',
            query: panel?.chart?.[0]?.search?.[0]?.query?.[0] ?? '',
            viz_type: getVizType(panel?.chart?.[0]),
            position: getPosition(panel?.chart?.[0]),
          })) ?? []
      ) ?? [];

    return {
      parsed_original_dashboard: {
        title: state.original_dashboard.title,
        panels,
      },
    };
  };
};

function getVizType(chart: ChartPanel | undefined): VizType {
  // TODO: Implement logic to determine viz type
  return 'pie';
}

function getPosition(chart: ChartPanel | undefined): PanelPosition {
  // TODO: Implement logic to determine position
  return { x: 0, y: 0, w: 0, h: 0 };
}
