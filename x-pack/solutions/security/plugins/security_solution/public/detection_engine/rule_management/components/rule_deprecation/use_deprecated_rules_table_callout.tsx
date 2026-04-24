/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useTimedDismissal } from '../../../../common/hooks/use_timed_dismissal';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useExecuteBulkAction } from '../../logic/bulk_actions/use_execute_bulk_action';
import { usePrebuiltRulesDeprecationReview } from '../../logic/prebuilt_rules/use_prebuilt_rules_deprecation_review';
import { DeleteDeprecatedRulesConfirmModal } from './delete_deprecated_rules_confirm_modal';
import { DeprecatedRulesCallout } from './deprecated_rules_callout';
import { DeprecatedRulesModal } from './deprecated_rules_modal';
import * as i18n from './translations';

export const DISMISSAL_STORAGE_KEY = 'securitySolution.deprecatedRulesCallout.dismissedAt';

export const useDeprecatedRulesTableCallout = () => {
  const isFeatureEnabled = useIsExperimentalFeatureEnabled('prebuiltRulesDeprecationUIEnabled');
  const [isModalVisible, showModal, hideModal] = useBoolState();
  const [isConfirmVisible, showConfirm, hideConfirm] = useBoolState();
  const [isDismissed, dismiss] = useTimedDismissal(DISMISSAL_STORAGE_KEY);
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const {
    docLinks: {
      links: {
        securitySolution: { manageDetectionRules },
      },
    },
  } = useKibana().services;
  const { data, isLoading } = usePrebuiltRulesDeprecationReview(null, {
    enabled: isFeatureEnabled,
  });
  const { executeBulkAction } = useExecuteBulkAction();

  const handleDeleteAll = useCallback(async () => {
    if (!data?.rules.length) {
      return;
    }
    hideConfirm();
    await executeBulkAction({
      type: BulkActionTypeEnum.delete,
      ids: data.rules.map((rule) => rule.id),
    });
  }, [data?.rules, executeBulkAction, hideConfirm]);

  if (!isFeatureEnabled || isDismissed || isLoading || !data || data.rules.length === 0) {
    return null;
  }

  return (
    <>
      <DeprecatedRulesCallout
        title={i18n.DEPRECATION_CALLOUT_TITLE(data.rules.length)}
        description={
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.deprecation.tableCalloutDescription"
            defaultMessage="These rules have been deprecated and won't receive new updates or fixes. Duplicate them as custom rules, delete them now, or dismiss this to be reminded in 7 days. {docsLink}"
            values={{
              docsLink: (
                <EuiLink href={`${manageDetectionRules}#deprecated-prebuilt-rules`} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.deprecation.tableCalloutDocsLink"
                    defaultMessage="Read the docs to learn more."
                  />
                </EuiLink>
              ),
            }}
          />
        }
        buttons={[
          <EuiButton
            color="warning"
            onClick={showModal}
            data-test-subj="deprecated-rules-table-view-button"
            fill
          >
            {i18n.REVIEW_DEPRECATED_RULES}
          </EuiButton>,
          <EuiButton
            color="warning"
            onClick={showConfirm}
            disabled={!canEditRules}
            data-test-subj="deprecated-rules-table-delete-button"
          >
            {i18n.DELETE_DEPRECATED_RULES}
          </EuiButton>,
        ]}
        onDismiss={dismiss}
        dataTestSubj="deprecated-rules-table-callout"
      />
      {isModalVisible && (
        <DeprecatedRulesModal rules={data.rules} isLoading={isLoading} onClose={hideModal} />
      )}
      {isConfirmVisible && (
        <DeleteDeprecatedRulesConfirmModal
          count={data.rules.length}
          onCancel={hideConfirm}
          onConfirm={handleDeleteAll}
        />
      )}
    </>
  );
};
