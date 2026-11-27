/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const t = (key: string, defaultMessage: string) =>
  i18n.translate(`xpack.securitySolution.flyoutV2.detonation.submittedToast.${key}`, {
    defaultMessage,
  });

export const DETONATION_SUBMITTED_TITLE = t('title', 'Detonation submitted');
export const DETONATION_SUBMITTED_SUBTITLE = t('subtitle', 'This may take a few minutes');
export const VIEW_IN_DETONATE = t('viewInDetonate', 'View in Detonate');

interface DetonationSubmittedToastContentProps {
  onView: () => void;
}

/** Body of the "Detonation submitted" toast: a sub header and a button to the Detonate page. */
export const DetonationSubmittedToastContent = memo(
  ({ onView }: DetonationSubmittedToastContentProps) => (
    <>
      <EuiText size="s">
        <p>{DETONATION_SUBMITTED_SUBTITLE}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={onView} data-test-subj="detonationToastViewInDetonate">
        {VIEW_IN_DETONATE}
      </EuiButton>
    </>
  )
);
DetonationSubmittedToastContent.displayName = 'DetonationSubmittedToastContent';

export const DETONATION_COMPLETE_TITLE = t('completeTitle', 'Detonation complete');
export const DETONATION_COMPLETE_SUBTITLE = t('completeSubtitle', 'The behavior report is ready');
export const SEE_DETAILS = t('seeDetails', 'See details');

interface DetonationCompleteToastContentProps {
  onView: () => void;
}

/** Body of the "Detonation complete" toast: a sub header and a button that opens the report. */
export const DetonationCompleteToastContent = memo(
  ({ onView }: DetonationCompleteToastContentProps) => (
    <>
      <EuiText size="s">
        <p>{DETONATION_COMPLETE_SUBTITLE}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={onView} data-test-subj="detonationToastSeeDetails">
        {SEE_DETAILS}
      </EuiButton>
    </>
  )
);
DetonationCompleteToastContent.displayName = 'DetonationCompleteToastContent';
