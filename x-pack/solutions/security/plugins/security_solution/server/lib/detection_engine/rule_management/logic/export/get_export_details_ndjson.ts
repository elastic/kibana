/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportExceptionDetails } from '@kbn/securitysolution-io-ts-list-types';
import type { ExportRulesDetails } from '../../../../../../common/api/detection_engine/rule_management';
import type { DefaultActionConnectorDetails } from './get_export_rule_action_connectors';
import type { ExportableRule } from './exportable_rule';

export const getExportDetailsNdjson = (
  rules: ExportableRule[],
  missingRuleIds: string[] = [],
  exceptionDetails?: ExportExceptionDetails,
  actionConnectorDetails?: DefaultActionConnectorDetails
): string => {
  let exportedCount = rules.length;
  if (actionConnectorDetails != null)
    exportedCount += actionConnectorDetails.exported_action_connector_count;
  if (exceptionDetails != null)
    exportedCount +=
      exceptionDetails.exported_exception_list_count +
      exceptionDetails.exported_exception_list_item_count;

  const stringified: ExportRulesDetails = {
    exported_count: exportedCount,
    exported_rules_count: rules.length,
    missing_rules: missingRuleIds.map((id) => ({ rule_id: id })),
    missing_rules_count: missingRuleIds.length,
    ...exceptionDetails,
    ...actionConnectorDetails,
  };
  return `${JSON.stringify(stringified)}\n`;
};
