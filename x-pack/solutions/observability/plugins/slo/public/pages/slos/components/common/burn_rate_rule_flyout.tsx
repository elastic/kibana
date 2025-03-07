/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { useQueryClient } from '@tanstack/react-query';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../hooks/use_kibana';
import { paths } from '../../../../../common/locators/paths';
import { sloKeys } from '../../../../hooks/query_key_factory';

export function BurnRateRuleFlyout({
  slo,
  isAddRuleFlyoutOpen,
  canChangeTrigger,
  setIsAddRuleFlyoutOpen,
}: {
  slo?: SLOWithSummaryResponse;
  isAddRuleFlyoutOpen: boolean;
  canChangeTrigger?: boolean;
  setIsAddRuleFlyoutOpen?: (value: boolean) => void;
}) {
  const { services } = useKibana();
  const {
    application: { navigateToUrl },
    http: { basePath },
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const queryClient = useQueryClient();

  const handleSavedRule = async () => {
    if (setIsAddRuleFlyoutOpen) {
      queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
      setIsAddRuleFlyoutOpen(false);
    } else {
      navigateToUrl(basePath.prepend(paths.slos));
    }
  };

  const handleCloseRuleFlyout = async () => {
    if (setIsAddRuleFlyoutOpen) {
      setIsAddRuleFlyoutOpen(false);
    } else {
      navigateToUrl(basePath.prepend(paths.slos));
    }
  };

  return isAddRuleFlyoutOpen && slo ? (
    <RuleFormFlyout
      plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
      consumer={sloFeatureId}
      filteredRuleTypes={filteredRuleTypes}
      ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
      initialValues={{ name: `${slo.name} Burn Rate rule`, params: { sloId: slo.id } }}
      onSubmit={handleSavedRule}
      onCancel={handleCloseRuleFlyout}
      shouldUseRuleProducer
    />
  ) : null;
}
