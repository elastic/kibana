/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

export const EMPTY_PROMPT_TEST_ID = 'indicatorEmptyPrompt';

export const IndicatorEmptyPrompt: FC = () => (
  <EuiEmptyPrompt
    iconType="warning"
    color="danger"
    title={
      <h2>
        <FormattedMessage
          id="xpack.securitySolution.threatIntelligence.indicator.flyoutTable.errorMessageTitle"
          defaultMessage="Unable to display indicator information"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.securitySolution.threatIntelligence.indicator.flyoutTable.errorMessageBody"
          defaultMessage="There was an error displaying the indicator fields and values."
        />
      </p>
    }
    data-test-subj={EMPTY_PROMPT_TEST_ID}
  />
);
