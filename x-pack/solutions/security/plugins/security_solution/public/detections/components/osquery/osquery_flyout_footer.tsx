/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface EventDetailsFooterProps {
  handleClick: () => void;
}

export const OsqueryEventDetailsFooterComponent = ({ handleClick }: EventDetailsFooterProps) => {
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={handleClick} data-test-subj="osquery-empty-button">
          <FormattedMessage id="xpack.securitySolution.footer.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const OsqueryEventDetailsFooter = React.memo(OsqueryEventDetailsFooterComponent);
