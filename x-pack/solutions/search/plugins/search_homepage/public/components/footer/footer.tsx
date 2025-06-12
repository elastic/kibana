/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../common/doc_links';

export const Footer: React.FC = () => (
  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiLink
        href="https://www.elastic.co/community/"
        target="_blank"
        data-test-subj="elasticCommunityLink"
      >
        {i18n.translate('xpack.searchHomepage.footer.elasticCommunity', {
          defaultMessage: 'Connect with the Elastic Community',
        })}
      </EuiLink>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink href={docLinks.kibanaFeedback} target="_blank" data-test-subj="giveFeedbackLink">
        {i18n.translate('xpack.searchHomepage.footer.giveFeedback', {
          defaultMessage: 'Give feedback',
        })}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
