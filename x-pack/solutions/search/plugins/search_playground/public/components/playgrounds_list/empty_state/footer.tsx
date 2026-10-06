/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../common/doc_links';

export const EmptyStateFooter = () => (
  <EuiFlexGroup gutterSize="s" alignItems="flexStart">
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <span>
          <FormattedMessage
            id="xpack.searchPlayground.playgroundsList.emptyPrompt.footer"
            defaultMessage="Questions on how to get started?"
          />
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink
        data-test-subj="searchPlaygroundsEmptyPromptFooterLink"
        href={docLinks.chatPlayground}
        target="_blank"
        external
      >
        <FormattedMessage
          id="xpack.searchPlayground.playgroundsList.emptyPrompt.footerLink"
          defaultMessage="View the documentation"
        />
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
