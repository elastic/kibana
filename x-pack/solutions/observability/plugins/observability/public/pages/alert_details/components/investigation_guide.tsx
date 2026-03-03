/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiButton, EuiSpacer, EuiMarkdownFormat } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleFormStepId } from '@kbn/response-ops-rule-form/src/constants';
import React, { useState } from 'react';
import {
  AlertDetailsRuleFormFlyout,
  type AlertDetailsRuleFormFlyoutBaseProps,
} from './alert_details_rule_form_flyout';

interface InvestigationGuideProps extends AlertDetailsRuleFormFlyoutBaseProps {
  blob?: string;
}

export function InvestigationGuide({ blob, onUpdate, refetch, rule }: InvestigationGuideProps) {
  const [alertDetailsRuleFormFlyoutOpen, setAlertDetailsRuleFormFlyoutOpen] = useState(false);
  return blob ? (
    <>
      <EuiSpacer size="m" />
      <EuiMarkdownFormat
        css={css`
          word-wrap: break-word;
        `}
      >
        {blob}
      </EuiMarkdownFormat>
    </>
  ) : (
    <>
      <EuiEmptyPrompt
        data-test-subj="alertInvestigationGuideEmptyPrompt"
        iconType="logoObservability"
        iconColor="default"
        title={
          <h3>
            <FormattedMessage
              id="xpack.observability.alertDetails.investigationGide.emptyPrompt.title"
              defaultMessage="Add an Investigation Guide"
            />
          </h3>
        }
        titleSize="m"
        body={
          <p>
            <FormattedMessage
              id="xpack.observability.alertDetails.investigationGide.emptyPrompt.body"
              defaultMessage="Add a guide to your alert's rule."
            />
          </p>
        }
        actions={
          <EuiButton
            data-test-subj="xpack.observability.alertDetails.investigationGuide.emptyPrompt.addGuide"
            color="primary"
            onClick={() => setAlertDetailsRuleFormFlyoutOpen(true)}
            fill
          >
            <FormattedMessage
              id="xpack.observability.alertDetails.investigationGide.emptyPrompt.addGuideButton.copy"
              defaultMessage="Add guide"
            />
          </EuiButton>
        }
      />
      {!!rule && (
        <AlertDetailsRuleFormFlyout
          initialEditStep={RuleFormStepId.DETAILS}
          isRuleFormFlyoutOpen={alertDetailsRuleFormFlyoutOpen}
          setIsRuleFormFlyoutOpen={setAlertDetailsRuleFormFlyoutOpen}
          onUpdate={onUpdate}
          refetch={refetch}
          rule={rule}
        />
      )}
    </>
  );
}
