/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CallOutMessage } from '../../../../common/components/callouts';
import { useCallOutStorage } from '../../../../common/components/callouts/use_callout_storage';
import { useShouldShowCpsMlRuleCallout } from './use_should_show_cps_ml_rule_callout';

export const CPS_ML_RULE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.cpsMlRuleCallout.title',
  {
    defaultMessage: 'Cross-project search for Machine Learning rules coming soon',
  }
);

export const CPS_ML_RULE_CALLOUT_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.cpsMlRuleCallout.body',
  {
    defaultMessage:
      "While we're working on this feature, all machine learning rule search scope will be limited to the current project.",
  }
);

const CPS_ML_RULE_CALLOUT_MESSAGE: CallOutMessage = {
  type: 'primary',
  id: 'cps-ml-rule',
  title: CPS_ML_RULE_CALLOUT_TITLE,
  description: (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.cpsMlRuleCallout.body"
      defaultMessage={CPS_ML_RULE_CALLOUT_BODY}
    />
  ),
};

const CpsMlRuleCalloutComponent = () => {
  const cpsEnvironmentMatches = useShouldShowCpsMlRuleCallout();

  const { isVisible, dismiss } = useCallOutStorage([CPS_ML_RULE_CALLOUT_MESSAGE], 'detections');

  const onDismiss = useCallback(() => {
    dismiss(CPS_ML_RULE_CALLOUT_MESSAGE);
  }, [dismiss]);

  const shouldRender = cpsEnvironmentMatches && isVisible(CPS_ML_RULE_CALLOUT_MESSAGE);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        color="primary"
        title={CPS_ML_RULE_CALLOUT_MESSAGE.title}
        iconType="info"
        onDismiss={onDismiss}
        dismissButtonProps={{ 'data-test-subj': 'callout-cps-ml-rule-dismiss' }}
        data-test-subj="callout-cps-ml-rule"
      >
        <EuiText size="s">{CPS_ML_RULE_CALLOUT_MESSAGE.description}</EuiText>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const CpsMlRuleCallout = memo(CpsMlRuleCalloutComponent);
