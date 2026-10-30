/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

export const BackButton: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const history = useHistory();
  const location = useLocation();

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="observabilityOnboardingFlowBackToSelectionButton"
        iconType="chevronSingleLeft"
        flush="left"
        onClick={() => {
          history.push({
            pathname: '/',
            search: location.search,
          });
        }}
      >
        {children
          ? children
          : i18n.translate(
              'xpack.observability_onboarding.experimentalOnboardingFlow.button.backToSelectionLabel',
              { defaultMessage: 'Back to selection' }
            )}
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
    </>
  );
};
