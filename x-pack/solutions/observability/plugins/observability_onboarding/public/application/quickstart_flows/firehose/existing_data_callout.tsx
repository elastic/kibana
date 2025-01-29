/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, useIsWithinMaxBreakpoint } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function ExistingDataCallout() {
  const isMobile = useIsWithinMaxBreakpoint('s');

  return (
    <div css={{ maxWidth: isMobile ? '100%' : '80%' }}>
      <EuiCallOut
        title={i18n.translate('xpack.observability_onboarding.firehose.existingDataCallout.title', {
          defaultMessage: 'This workflow has been used before.',
        })}
        iconType="iInCircle"
        color="warning"
        data-test-subj="observabilityOnboardingFirehosePanelExistingDataCallout"
      >
        <p>
          {i18n.translate(
            'xpack.observability_onboarding.firehose.existingDataCallout.description',
            {
              defaultMessage: `If the Amazon Firehose Data stream(s) associated with this workflow are still active, you will encounter errors during onboarding. Navigate to Step 3 below in order to explore your services.`,
            }
          )}
        </p>
      </EuiCallOut>
    </div>
  );
}
