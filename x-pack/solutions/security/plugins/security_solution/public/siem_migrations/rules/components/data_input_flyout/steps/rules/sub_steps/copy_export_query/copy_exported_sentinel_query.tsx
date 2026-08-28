/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { MigrationSource } from '../../../../../../../common/types';
import { useRuleMigrationVendorCopy } from '../../../../../../hooks/use_rule_migration_vendor_copy';

export const CopyExportedSentinelQuery = React.memo(() => {
  const { copyExportQuery } = useRuleMigrationVendorCopy(MigrationSource.SENTINEL);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText>{copyExportQuery.description}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCallOut
          title={copyExportQuery.details?.rulesTypeSupportCallout}
          size="s"
          iconType="pin"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

CopyExportedSentinelQuery.displayName = 'CopyExportedSentinelQuery';
