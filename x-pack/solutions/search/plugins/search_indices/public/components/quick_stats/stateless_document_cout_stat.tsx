/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Index } from '@kbn/index-management-shared-types';

import { EuiI18nNumber, type EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QuickStat } from './quick_stat';

export interface StatelessDocumentCountStatProps {
  euiTheme: EuiThemeComputed<{}>;
  index: Index;
  documentCount: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  first?: boolean;
}

export const StatelessDocumentCountStat = ({
  euiTheme,
  first,
  index,
  documentCount,
  open,
  setOpen,
}: StatelessDocumentCountStatProps) => (
  <QuickStat
    open={open}
    setOpen={setOpen}
    icon="documents"
    iconColor={euiTheme.colors.fullShade}
    title={i18n.translate('xpack.searchIndices.quickStats.document_count_heading', {
      defaultMessage: 'Document count',
    })}
    data-test-subj="QuickStatsDocumentCount"
    secondaryTitle={<EuiI18nNumber value={documentCount} />}
    stats={[
      {
        title: i18n.translate('xpack.searchIndices.quickStats.documents.totalTitle', {
          defaultMessage: 'Total',
        }),
        description: <EuiI18nNumber value={documentCount} />,
      },
      {
        title: i18n.translate('xpack.searchIndices.quickStats.documents.indexSize', {
          defaultMessage: 'Index Size',
        }),
        description: index.size ?? '0b',
      },
    ]}
    tooltipContent={i18n.translate('xpack.searchIndices.quickStats.documentCountTooltip', {
      defaultMessage:
        'This excludes nested documents, which Elasticsearch uses internally to store chunks of vectors.',
    })}
    first={first}
  />
);
