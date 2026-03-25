/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useKibana } from '../../../../common/lib/kibana';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useBulkActionMutation } from '../../api/hooks/use_bulk_action_mutation';
import { usePrebuiltRulesDeprecationReview } from '../../logic/prebuilt_rules/use_prebuilt_rules_deprecation_review';
import { DeprecatedRulesCallout } from './deprecated_rules_callout';
import * as i18n from './translations';
import { APP_UI_ID, SecurityPageName } from '../../../../../common';
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';

interface UseDeprecatedRuleDetailsCalloutProps {
  rule: RuleResponse | null;
  confirmDeletion: () => Promise<boolean>;
}

export const useDeprecatedRuleDetailsCallout = ({
  rule,
  confirmDeletion,
}: UseDeprecatedRuleDetailsCalloutProps) => {
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;

  const isPrebuiltRule = rule?.rule_source?.type === 'external';
  const { data, isLoading } = usePrebuiltRulesDeprecationReview(
    rule?.id ? { ids: [rule.id] } : null,
    { enabled: isPrebuiltRule }
  );
  const { mutateAsync: executeBulkAction } = useBulkActionMutation();

  const onRuleDeleted = useCallback(() => {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });
  }, [navigateToApp]);

  const isDeprecated = (data?.rules?.length ?? 0) > 0;

  const handleDelete = useCallback(async () => {
    if (!rule) {
      return;
    }
    if ((await confirmDeletion()) === false) {
      return;
    }
    await executeBulkAction({
      bulkAction: {
        type: BulkActionTypeEnum.delete,
        ids: [rule.id],
      },
    });
    onRuleDeleted();
  }, [confirmDeletion, executeBulkAction, onRuleDeleted, rule]);

  if (!isDeprecated || isLoading) {
    return null;
  }

  return (
    <DeprecatedRulesCallout
      title={i18n.DEPRECATION_DETAILS_CALLOUT_TITLE}
      description={i18n.DEPRECATION_DETAILS_CALLOUT_DESCRIPTION}
      buttonLabel={i18n.DELETE_RULE}
      onButtonClick={handleDelete}
      isButtonDisabled={!canEditRules}
      data-test-subj="deprecated-rule-details-callout"
    />
  );
};
