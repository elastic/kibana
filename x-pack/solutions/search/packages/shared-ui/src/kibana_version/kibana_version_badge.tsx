/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, EuiLink, EuiCopy, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface SearchHomepageVersionBadgeProps {
  kibanaVersion: string;
  docLink: string;
}
export const SearchHomepageVersionBadge: React.FC<SearchHomepageVersionBadgeProps> = ({
  kibanaVersion,
  docLink,
}) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="homepage-kibana-version"
          color="text"
          target="_blank"
          href={docLink}
        >
          {kibanaVersion}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={kibanaVersion}>
          {(copy) => (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.searchHomepage.versionCopyButton', {
                defaultMessage: 'Copy version to clipboard',
              })}
              data-test-subj="homepage-copy-version"
              iconType="copyClipboard"
              color="text"
              size="xs"
              onClick={copy}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
