/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { SyntheticsMonitorStatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants/ui';

export const getDescriptionFields: GetDescriptionFieldsFn<
  TLSRuleParams | SyntheticsMonitorStatusRuleParams
> = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) {
    return [];
  }

  const fields = [prebuildFields.indexPattern([SYNTHETICS_INDEX_PATTERN])];

  if (rule.params.kqlQuery) {
    fields.push(prebuildFields.customQuery(rule.params.kqlQuery));
  }

  return fields;
};
