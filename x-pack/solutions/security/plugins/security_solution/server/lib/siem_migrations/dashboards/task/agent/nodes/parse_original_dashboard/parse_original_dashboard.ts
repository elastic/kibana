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
import type { GraphNode, MigrateDashboardGraphParams } from '../../types';

export const getParseOriginalDashboardNode = (params: MigrateDashboardGraphParams): GraphNode => {
  return async (state) => {
    if (state.original_dashboard.vendor !== 'splunk') {
      throw new Error('Unsupported dashboard vendor');
    }

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
};
