/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERTZERO_FEATURE_ID } from '@kbn/alertzero-common';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import * as i18n from './translations';

export const OnboardingPage: React.FC = () => {
  const history = useHistory();
  const {
    services: { application },
  } = useKibana<CoreStart>();
  useAlertZeroDocTitle(i18n.ONBOARDING_TITLE);

  const canWrite = Boolean(application.capabilities[ALERTZERO_FEATURE_ID]?.write);

  return (
    <AlertZeroPageSection>
      <EuiEmptyPrompt
        iconType="watchesApp"
        title={<h2>{i18n.ONBOARDING_TITLE}</h2>}
        body={<p>{canWrite ? i18n.ONBOARDING_BODY : i18n.ONBOARDING_READ_ONLY_BODY}</p>}
        actions={
          canWrite ? (
            <EuiButton fill onClick={() => history.push('/watches')}>
              {i18n.ONBOARDING_ACTION}
            </EuiButton>
          ) : undefined
        }
      />
    </AlertZeroPageSection>
  );
};
