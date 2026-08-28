/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';

const PartialResultsCalloutComponent: React.FC = () => {
  return (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.PARTIAL_RESULTS_WARNING_TITLE}
        data-test-subj="eql-partial-results-warning"
      >
        <p>{i18n.PARTIAL_RESULTS_WARNING_BODY}</p>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};

export const PartialResultsCallout = memo(PartialResultsCalloutComponent);
