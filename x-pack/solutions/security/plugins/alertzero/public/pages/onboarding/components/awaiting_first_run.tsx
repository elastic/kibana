/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { AlertZeroPageSection } from '../../../components/layout/alertzero_page_section';
import * as i18n from '../translations';

/**
 * S2 — watches are installed but none have produced a run (no proposals / no run evidence) yet. This
 * is not a stored step: as soon as any watch runs, the derived state moves on by itself.
 */
export const AwaitingFirstRun: React.FC = () => {
  const history = useHistory();
  return (
    <AlertZeroPageSection>
      <EuiEmptyPrompt
        data-test-subj="alertZeroOnboardingAwaitingRunPage"
        iconType="clock"
        title={<h2>{i18n.AWAITING_TITLE}</h2>}
        body={<p>{i18n.AWAITING_BODY}</p>}
        actions={
          <EuiButton
            data-test-subj="alertZeroOnboardingGoToWatches"
            onClick={() => history.push('/watches')}
          >
            {i18n.AWAITING_CTA}
          </EuiButton>
        }
      />
    </AlertZeroPageSection>
  );
};
