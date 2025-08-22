/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const CreateMLJobsButton: React.FunctionComponent<{
  isDisabled?: boolean;
  onClick: () => void;
}> = ({ isDisabled, onClick }) => {
  return (
    <>
      <FormattedMessage
        id="xpack.infra.analysisSetup.retentionPeriodText"
        defaultMessage="The results are retained for 120 days by default."
        tagName="p"
      />
      <EuiButton
        data-test-subj="infraCreateMLJobsButtonCreateMlJobButton"
        isDisabled={isDisabled}
        fill
        onClick={onClick}
      >
        <FormattedMessage
          id="xpack.infra.analysisSetup.createMlJobButton"
          defaultMessage="Create ML job"
        />
      </EuiButton>
    </>
  );
};
