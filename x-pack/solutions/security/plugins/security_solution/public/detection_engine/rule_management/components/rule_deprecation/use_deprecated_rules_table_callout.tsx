/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useTimedDismissal } from '../../../../common/hooks/use_timed_dismissal';
import { usePrebuiltRulesDeprecationReview } from '../../logic/prebuilt_rules/use_prebuilt_rules_deprecation_review';
import { DeprecatedRulesCallout } from './deprecated_rules_callout';
import { DeprecatedRulesModal } from './deprecated_rules_modal';
import * as i18n from './translations';

const DISMISSAL_STORAGE_KEY = 'securitySolution.deprecatedRulesCallout.dismissedAt';

export const useDeprecatedRulesTableCallout = () => {
  const [isModalVisible, showModal, hideModal] = useBoolState();
  const [isDismissed, dismiss] = useTimedDismissal(DISMISSAL_STORAGE_KEY);
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const { data, isLoading } = usePrebuiltRulesDeprecationReview(null);

  if (isDismissed || isLoading || !data || data.rules.length === 0) {
    return null;
  }

  return (
    <>
      <DeprecatedRulesCallout
        title={i18n.DEPRECATION_CALLOUT_TITLE(data.rules.length)}
        description={i18n.DEPRECATION_TABLE_CALLOUT_DESCRIPTION}
        buttonLabel={i18n.REVIEW_DEPRECATED_RULES}
        onButtonClick={showModal}
        isButtonDisabled={!canEditRules}
        onDismiss={dismiss}
        data-test-subj="deprecated-rules-table-callout"
      />
      {isModalVisible && (
        <DeprecatedRulesModal rules={data.rules} isLoading={isLoading} onClose={hideModal} />
      )}
    </>
  );
};
