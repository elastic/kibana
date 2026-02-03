/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Index } from '@kbn/index-management-shared-types';
import { formatBytes } from '@kbn/index-management-plugin/public';

import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { QuickStat } from './quick_stat';
import { INDEX_SIZE_LABEL } from './constants';

export interface StatefulIndexStorageStatProps {
  index: Index;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StatefulIndexStorageStat = ({
  index,
  open,
  setOpen,
}: StatefulIndexStorageStatProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <QuickStat
      open={open}
      setOpen={setOpen}
      icon="storage"
      iconColor={euiTheme.colors.fullShade}
      title={i18n.translate('xpack.searchIndices.quickStats.storage_heading', {
        defaultMessage: 'Storage',
      })}
      data-test-subj="QuickStatsStorage"
      secondaryTitle={formatBytes(index.size)}
      stats={[
        {
          title: INDEX_SIZE_LABEL,
          description: formatBytes(index.size),
        },
        {
          title: i18n.translate('xpack.searchIndices.quickStats.primarySize_title', {
            defaultMessage: 'Primary Size',
          }),
          description: formatBytes(index.primary_size),
        },
      ]}
    />
  );
};
