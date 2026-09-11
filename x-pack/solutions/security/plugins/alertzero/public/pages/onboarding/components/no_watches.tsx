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
 * S1 — enabled but no watch installed. Directs the user to the watch catalog so the first watch can
 * be installed and the state can progress toward a first run.
 */
export const NoWatches: React.FC = () => {
  const history = useHistory();
  return (
    <AlertZeroPageSection>
      <EuiEmptyPrompt
        data-test-subj="alertZeroOnboardingNoWatchesPage"
        iconType="securitySignalDetected"
        title={<h2>{i18n.NO_WATCHES_TITLE}</h2>}
        body={<p>{i18n.NO_WATCHES_BODY}</p>}
        actions={
          <EuiButton
            data-test-subj="alertZeroOnboardingBrowseCatalog"
            onClick={() => history.push('/watches')}
            fill
          >
            {i18n.NO_WATCHES_CTA}
          </EuiButton>
        }
      />
    </AlertZeroPageSection>
  );
};
