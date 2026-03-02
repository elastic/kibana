/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { createRule, findRules } from '../common/detection_rules_services';
import { prefixedOutputLogger } from '../common/utils';
import { REF7707_DEMO_DOMAINS, REF7707_DOMAINS } from './constants';

/**
 * Creates a detection rule for monitoring malicious domains from Elastic Security Labs report REF7707
 */
export const createDetectionRule = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
  const logger = prefixedOutputLogger('createDetectionRule()', log);

  logger.info('Creating detection rule for RSA 2026 demo (REF7707 domains)');

  return logger.indent(4, async () => {
    const ruleName = 'RSA 2026 Demo - Malicious Domain Detection (REF7707)';

    // Check if rule already exists
    const existingRules = await findRules(kbnClient, {
      perPage: 1,
      filter: `alert.attributes.name: "${ruleName}"`,
    });

    if (existingRules.data.length > 0) {
      logger.info(`Detection rule already exists: ${ruleName} (${existingRules.data[0].id})`);
      return existingRules.data[0].id;
    }

    // Build KQL query for malicious domains
    const allDomains = [...new Set([...REF7707_DEMO_DOMAINS, ...REF7707_DOMAINS])];
    const domainList = allDomains.map((d) => `"${d}"`).join(' or ');
    const kqlQuery = `dns.question.name: (${domainList}) or destination.domain: (${domainList}) or url.domain: (${domainList})`;

    logger.verbose(`KQL Query: ${kqlQuery}`);

    const rule = await createRule(kbnClient, {
      name: ruleName,
      description: `Monitors for malicious domains identified in Elastic Security Labs report REF7707 (Fragile Web). These domains use typosquatting techniques to mimic legitimate brands and are associated with APT groups and phishing campaigns.

Reference: https://www.elastic.co/security-labs/fragile-web-ref7707`,
      query: kqlQuery,
      language: 'kuery',
      type: 'query',
      index: [
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'traces-apm*',
        'winlogbeat-*',
        '-*elastic-cloud-logs-*',
      ],
      risk_score: 73,
      severity: 'high',
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0001',
            name: 'Initial Access',
            reference: 'https://attack.mitre.org/tactics/TA0001/',
          },
          technique: [
            {
              id: 'T1566',
              name: 'Phishing',
              reference: 'https://attack.mitre.org/techniques/T1566/',
            },
          ],
        },
      ],
      references: ['https://www.elastic.co/security-labs/fragile-web-ref7707'],
      author: ['Elastic Security Labs'],
      tags: ['rsa-2026-demo', 'ref7707', 'typosquatting', 'phishing', 'apt'],
      false_positives: [],
      interval: '5m',
      from: 'now-6m',
      to: 'now',
      enabled: true,
      actions: [],
      throttle: 'no_actions',
    });

    logger.info(`Detection rule created: ${rule.name} (${rule.id})`);
    logger.verbose(rule);

    return rule.id;
  });
};
