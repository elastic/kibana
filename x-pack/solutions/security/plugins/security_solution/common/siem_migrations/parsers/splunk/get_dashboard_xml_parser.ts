/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SplunkXmlDashboardParser } from './dashboard_xml';
import { SplunkXmlDashboardV2Parser } from './dashboard_xml_v2';

export const getSplunkDashboardXmlParser = async (xml: string) => {
  const dashboardParser = new SplunkXmlDashboardParser(xml);

  const version = await dashboardParser.getVersion();

  if (version === '2') {
    return new SplunkXmlDashboardV2Parser(xml);
  }

  return dashboardParser;
};
