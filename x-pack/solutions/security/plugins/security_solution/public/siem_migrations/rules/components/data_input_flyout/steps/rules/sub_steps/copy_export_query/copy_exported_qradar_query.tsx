/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { MigrationSource } from '../../../../../../../common/types';
import { useRuleMigrationVendorCopy } from '../../../../../../hooks/use_rule_migration_vendor_copy';

export const CopyExportedQradarQuery = React.memo(() => {
  const { copyExportQuery } = useRuleMigrationVendorCopy(MigrationSource.QRADAR);

  return <EuiText>{copyExportQuery.description}</EuiText>;
});

CopyExportedQradarQuery.displayName = 'CopyExportedQradarQuery';
