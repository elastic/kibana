/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import * as i18n from './translations';

export const OnboardingPage: React.FC = () => {
  const history = useHistory();
  useAlertZeroDocTitle(i18n.ONBOARDING_TITLE);

  return (
    <AlertZeroPageSection>
      <EuiEmptyPrompt
        iconType="watchesApp"
        title={<h2>{i18n.ONBOARDING_TITLE}</h2>}
        body={<p>{i18n.ONBOARDING_BODY}</p>}
        actions={
          <EuiButton fill onClick={() => history.push('/watches')}>
            {i18n.ONBOARDING_ACTION}
          </EuiButton>
        }
      />
    </AlertZeroPageSection>
  );
};
