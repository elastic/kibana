/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSplunkDashboardXmlParser } from '../../../../../../../../common/siem_migrations/parsers/splunk/get_dashboard_xml_parser';
import { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import { generateAssistantComment } from '../../../../../common/task/util/comments';
import { SplunkXmlDashboardParser } from '../../../../../../../../common/siem_migrations/parsers/splunk/dashboard_xml';
import { SentinelWorkbookParser } from '../../../../../../../../common/siem_migrations/parsers/sentinel/workbook_json';
import type { SentinelWorkbookArmResource } from '../../../../../../../../common/siem_migrations/model/vendor/dashboards/sentinel.gen';
import type { GraphNode, MigrateDashboardGraphParams } from '../../types';

export const getParseOriginalDashboardNode = (params: MigrateDashboardGraphParams): GraphNode => {
  return async (state) => {
    if (state.original_dashboard.vendor === 'splunk') {
      return parseSplunkDashboard(state, params);
    }

    if (state.original_dashboard.vendor === 'microsoft-sentinel') {
      return parseSentinelWorkbook(state);
    }

    throw new Error(`Unsupported dashboard vendor: ${state.original_dashboard.vendor}`);
  };
};

const parseSplunkDashboard = async (
  state: Parameters<GraphNode>[0],
  params: MigrateDashboardGraphParams
) => {
  if (!params.experimentalFeatures.splunkV2DashboardsEnabled) {
    // Check if the XML content is supported only if Splunk V2 dashboards is not enabled
    // otherwise, all splunk dashboards are supported
    const supportCheck = SplunkXmlDashboardParser.isSupportedSplunkXml(
      state.original_dashboard.data
    );
    if (!supportCheck.isSupported) {
      return {
        parsed_original_dashboard: {
          title: state.original_dashboard.title,
          panels: [],
        },
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
        comments: [generateAssistantComment(`Unsupported Splunk XML: ${supportCheck.reason}`)],
      };
    }
  }

  const parser = await getSplunkDashboardXmlParser(state.original_dashboard.data, {
    experimentalFeatures: params.experimentalFeatures,
  });
  const panels = await parser.extractPanels();

  return {
    parsed_original_dashboard: {
      title: state.original_dashboard.title,
      panels,
    },
  };
};

const parseSentinelWorkbook = (state: Parameters<GraphNode>[0]) => {
  // The dashboards create route serializes a single Workbook into the
  // `data` field as the original Workbook's `serializedData` JSON. Wrap it back
  // into an ARM resource shape so the shared parser can produce panels.
  const resource: SentinelWorkbookArmResource = {
    name: state.original_dashboard.id,
    type: 'Microsoft.Insights/workbooks',
    properties: {
      displayName: state.original_dashboard.title,
      serializedData: state.original_dashboard.data,
    },
  };
  const parser = new SentinelWorkbookParser([resource]);
  const [workbook] = parser.getWorkbooks();

  if (!workbook) {
    return {
      parsed_original_dashboard: {
        title: state.original_dashboard.title,
        panels: [],
      },
      translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      comments: [
        generateAssistantComment('Unsupported Sentinel Workbook: no parsable query items found'),
      ],
    };
  }

  if (workbook.panels.length === 0) {
    return {
      parsed_original_dashboard: {
        title: workbook.title,
        panels: [],
      },
      translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      comments: [
        generateAssistantComment(
          'Unsupported Sentinel Workbook: only non-query items found (text/markdown/parameters not supported in v1)'
        ),
      ],
    };
  }

  return {
    parsed_original_dashboard: {
      title: workbook.title,
      panels: workbook.panels,
    },
  };
};
