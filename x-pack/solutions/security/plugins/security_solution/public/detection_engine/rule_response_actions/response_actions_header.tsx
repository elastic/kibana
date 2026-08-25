/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import React from 'react';

export const ResponseActionsHeader = () => {
  return (
    <>
      <EuiFlexItem grow={false} data-test-subj={'response-actions-header'}>
        <EuiTitle size="s">
          <h4>
            <FormattedMessage
              defaultMessage="Response Actions"
              id="xpack.securitySolution.actionForm.responseActionSectionsDescription"
            />
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer size="m" />

      <EuiFlexItem>
        <FormattedMessage
          defaultMessage="Response actions are run on each rule execution."
          id="xpack.securitySolution.actionForm.responseActionSectionsTitle"
        />
      </EuiFlexItem>
      <EuiSpacer size="m" />
    </>
  );
};
