/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { dump } from '../../common/utils';
import { createRule, findRules } from '../../common/detection_rules_services';
import type { RuleResponse } from '../../../../common/api/detection_engine';

export const createDetectionEngineCrowdStrikeRuleIfNeeded = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  /** Index namespace. If defined, then the Index patterns used the SIEM rule will include this value */
  namespace?: string
): Promise<RuleResponse> => {
  const ruleName = 'Promote CrowdStrike alerts';
  const tag = 'dev-script-run-crowdstrike-host';
  const indexNamespace = namespace ? `-${namespace}` : '';
  const index = [`*crowdstrike.alert${indexNamespace}*`];
  const ruleQueryValue = 'device.id: *';

  const { data } = await findRules(kbnClient, {
    filter: `alert.attributes.tags:("${tag}")`,
  });

  if (data.length) {
    log.info(
      `Detection engine rule for CrowdStrike alerts already exists [${data[0].name}]. No need to create a new one.`
    );

    return data[0];
  }

  log.info(`Creating new detection engine rule named [${ruleName}] for CrowdStrike`);

  const createdRule = await createRule(kbnClient, {
    index,
    query: ruleQueryValue,
    from: 'now-360s',
    meta: {
      from: '90m',
    },
    name: ruleName,
    description: `Created by dev script located at: ${__filename}`,
    tags: [tag],
  });

  log.verbose(dump(createdRule));

  return createdRule;
};
