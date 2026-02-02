/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VendorResourceIdentifier } from '../types';
import { QradarRulesXmlParser } from '../../parsers/qradar/rules_xml';

/**
 * Identifies QRadar reference sets from rule data XML.
 * Reference sets are QRadar's equivalent of lookups data.
 * They contain data like IPs, strings, etc. that rules reference for checks.
 *
 * @param ruleData - The decoded XML rule data string
 * @returns Array of identified resources with type 'lookup' and reference set names
 */
export const qradarResourceIdentifier: VendorResourceIdentifier = async (ruleData: string) => {
  const qRadarXmlParser = new QradarRulesXmlParser();
  let referenceSets: string[] = [];

  try {
    referenceSets = await qRadarXmlParser.getReferenceSetsFromRuleData(ruleData);
  } catch (error) {
    const message = `Error parsing QRadar rule data for reference sets: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new Error(message);
  }

  return referenceSets.map((name) => ({ type: 'lookup', name }));
};
