/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { RULES_SPLUNK_QUERY } from '../../../../constants';
import { MigrationSource } from '../../../../../../../common/types';
import { useRuleMigrationVendorCopy } from '../../../../../../hooks/use_rule_migration_vendor_copy';

interface CopyExportQueryProps {
  onCopied: () => void;
}
export const CopyExportedSplunkQuery = React.memo<CopyExportQueryProps>(({ onCopied }) => {
  const { copyExportQuery } = useRuleMigrationVendorCopy(MigrationSource.SPLUNK);
  const onClick: React.MouseEventHandler = useCallback(
    (ev) => {
      // The only button inside the element is the "copy" button.
      if ((ev.target as Element).tagName === 'BUTTON') {
        onCopied();
      }
    },
    [onCopied]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">{copyExportQuery.description}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        {/* The click event is also dispatched when using the keyboard actions (space or enter) for "copy" button.
        No need to use keyboard specific events, disabling the a11y lint rule:*/}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div onClick={onClick}>
          {/* onCopy react event is dispatched when the user copies text manually */}
          <EuiCodeBlock language="text" fontSize="m" paddingSize="m" isCopyable onCopy={onCopied}>
            {RULES_SPLUNK_QUERY}
          </EuiCodeBlock>
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          {copyExportQuery.details?.queryLimitDisclaimer}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CopyExportedSplunkQuery.displayName = 'CopyExportedSplunkQuery';
