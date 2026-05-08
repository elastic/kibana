/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RESPONSE_BUTTON_TEST_ID } from './test_ids';

export interface ResponseButtonProps {
  onShowResponseDetails: () => void;
}

/**
 * Response button that opens Response details.
 */
export const ResponseButton: React.FC<ResponseButtonProps> = ({ onShowResponseDetails }) => {
  return (
    <EuiButton
      onClick={onShowResponseDetails}
      iconType="documentation"
      data-test-subj={RESPONSE_BUTTON_TEST_ID}
      size="s"
    >
      <FormattedMessage
        id="xpack.securitySolution.flyout.response.responseButtonLabel"
        defaultMessage="Response"
      />
    </EuiButton>
  );
};

ResponseButton.displayName = 'ResponseButton';
