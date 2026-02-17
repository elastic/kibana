/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { MigrationSource } from '../../../common/types';
import { MIGRATION_VENDOR_DISPLAY_NAME } from '../../../common/constants';

export const useMigrationSourceOptions = () => {
  const isQradarEnabled = useIsExperimentalFeatureEnabled('qradarRulesMigration');

  const options: Array<EuiSuperSelectOption<MigrationSource>> = [
    {
      value: MigrationSource.SPLUNK,
      inputDisplay: <span>{MIGRATION_VENDOR_DISPLAY_NAME[MigrationSource.SPLUNK]}</span>,
    },
  ];

  if (isQradarEnabled) {
    options.push({
      value: MigrationSource.QRADAR,
      inputDisplay: (
        <span>
          {MIGRATION_VENDOR_DISPLAY_NAME[MigrationSource.QRADAR]}
          <EuiIcon type="flask" />
        </span>
      ),
    });
  }
  return options;
};
