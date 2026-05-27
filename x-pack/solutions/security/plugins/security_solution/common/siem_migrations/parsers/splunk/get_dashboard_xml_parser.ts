/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../experimental_features';
import { SplunkXmlDashboardParser } from './dashboard_xml';
import { SplunkXmlDashboardV2Parser } from './dashboard_xml_v2';

interface SplunkDashboardXmlParserDeps {
  experimentalFeatures: ExperimentalFeatures;
}

export const getSplunkDashboardXmlParser = async (
  xml: string,
  deps: SplunkDashboardXmlParserDeps
) => {
  const dashboardParser = new SplunkXmlDashboardParser(xml);
  const { splunkV2DashboardsEnabled } = deps.experimentalFeatures;

  const version = await dashboardParser.getVersion();
  if (!splunkV2DashboardsEnabled) {
    // always return old parser if V2 is not supported
    return dashboardParser;
  }

  if (version === '2') {
    return new SplunkXmlDashboardV2Parser(xml);
  }

  return dashboardParser;
};
