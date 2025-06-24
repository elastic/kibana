/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { CreateRuleRequestBody } from '@kbn/alerting-plugin/common/routes/rule/apis/create';
import { BURN_RATE_DEFAULTS } from '../../../components/burn_rate_rule_editor/constants';
import { createNewWindow } from '../../../components/burn_rate_rule_editor/windows';
import { BurnRateRuleParams } from '../../../typings';

function createBurnRateWindowsFromSLO(slo: CreateSLOInput) {
  const burnRateDefaults = slo
    ? BURN_RATE_DEFAULTS[slo?.timeWindow.duration]
    : BURN_RATE_DEFAULTS['30d'];
  return burnRateDefaults.map((partialWindow) => createNewWindow(slo, partialWindow));
}

export function createBurnRateRuleRequestBody(
  slo: CreateSLOInput & { id: string }
): CreateRuleRequestBody<BurnRateRuleParams> {
  return {
    params: {
      sloId: slo.id,
      windows: createBurnRateWindowsFromSLO(slo),
    },
    consumer: 'slo',
    schedule: { interval: '1m' },
    tags: [],
    name: i18n.translate('xpack.slo.burnRateRule.name', {
      defaultMessage: '{name} Burn Rate rule',
      values: { name: slo.name },
    }),
    rule_type_id: 'slo.rules.burnRate',
    actions: [],
    enabled: true,
  };
}
