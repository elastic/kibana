/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../common/doc_links';

export const Footer: React.FC = () => (
  <>
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem>
        <EuiLink href={docLinks.elasticCommunity} data-test-subj="elasticCommunityLink">
          {i18n.translate('xpack.searchHomepage.footer.elasticCommunity', {
            defaultMessage: 'Connect with the Elastic Community',
          })}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink href={docLinks.kibanaFeedback} data-test-subj="giveFeedbackLink">
          {i18n.translate('xpack.searchHomepage.footer.giveFeedback', {
            defaultMessage: 'Give feedback',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);
