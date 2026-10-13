/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { AlertInvestigation } from '../../../hooks/use_investigate_alert';

/**
 * Header actions for starting or opening an alert's investigation. Returned in
 * `rightSideItems` order: the first item sits furthest right, immediately left
 * of "Add to chat". Re-investigating lives in the actions menu instead.
 */
export function useAlertInvestigationHeaderActions({
  showInvestigateButton,
  showViewInvestigation,
  handleInvestigate,
  isInvestigating,
  investigateActionLabel,
  investigateEbtProps,
  viewInvestigationUrl,
  viewInvestigationActionLabel,
  viewInvestigationEbtProps,
  markInvestigationViewed,
  hasInvestigation,
}: AlertInvestigation): React.ReactElement[] {
  const { euiTheme } = useEuiTheme();
  const spinnerCss = css`
    margin-inline-end: ${euiTheme.size.s};
    vertical-align: middle;
  `;

  if (isInvestigating) {
    // `isLoading` would disable the button, but it must still open the running investigation.
    return [
      <AiButton
        key="alertDetailsInvestigate"
        variant="outlined"
        size="m"
        href={viewInvestigationUrl}
        isDisabled={!viewInvestigationUrl}
        onClick={markInvestigationViewed}
        aria-busy
        data-test-subj="alertDetailsInvestigate"
        {...viewInvestigationEbtProps}
      >
        <EuiLoadingSpinner size="m" css={spinnerCss} />
        {investigateActionLabel}
      </AiButton>,
    ];
  }

  const actions: React.ReactElement[] = [];

  if (showInvestigateButton && !hasInvestigation) {
    actions.push(
      <AiButton
        key="alertDetailsInvestigate"
        variant="outlined"
        size="m"
        iconType="inspect"
        onClick={handleInvestigate}
        data-test-subj="alertDetailsInvestigate"
        {...investigateEbtProps}
      >
        {investigateActionLabel}
      </AiButton>
    );
  }

  if (showViewInvestigation) {
    actions.push(
      <AiButton
        key="alertDetailsViewInvestigation"
        variant="outlined"
        size="m"
        iconType="eye"
        href={viewInvestigationUrl}
        onClick={markInvestigationViewed}
        data-test-subj="alertDetailsViewInvestigation"
        {...viewInvestigationEbtProps}
      >
        {viewInvestigationActionLabel}
      </AiButton>
    );
  }

  return actions;
}
