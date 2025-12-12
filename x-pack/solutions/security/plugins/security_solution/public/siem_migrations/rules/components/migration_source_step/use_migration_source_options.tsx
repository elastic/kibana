/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import * as i18n from './translations';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { MigrationSource } from '../../../common/types';

export const useMigrationSourceOptions = () => {
  const isQradarEnabled = useIsExperimentalFeatureEnabled('qradarRulesMigration');

  const options: Array<EuiSuperSelectOption<MigrationSource>> = [
    {
      value: MigrationSource.SPLUNK,
      inputDisplay: <span>{i18n.MIGRATION_SOURCE_DROPDOWN_OPTION_SPLUNK}</span>,
    },
  ];

  if (isQradarEnabled) {
    options.push({
      value: MigrationSource.QRADAR,
      inputDisplay: (
        <span>
          {i18n.MIGRATION_SOURCE_DROPDOWN_OPTION_QRADAR}
          <EuiIcon type="flask" />
        </span>
      ),
    });
  }
  return options;
};
