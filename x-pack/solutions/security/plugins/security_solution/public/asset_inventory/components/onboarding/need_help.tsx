/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DOCS_URL } from '../../constants';

export const NeedHelp = () => {
  return (
    <>
      <EuiTitle size="xxs">
        <strong>
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.emptyState.needHelp"
            defaultMessage="Need help?"
          />
        </strong>
      </EuiTitle>{' '}
      <EuiLink href={DOCS_URL} target="_blank">
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.emptyState.readDocumentation"
          defaultMessage="Read documentation"
        />
      </EuiLink>
    </>
  );
};
