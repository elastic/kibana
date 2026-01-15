/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { CopyExportedSplunkQuery } from './copy_exported_splunk_query';
import * as i18n from './translations';
import { CopyExportedQradarQuery } from './copy_exported_qradar_query';
import { MigrationSource } from '../../../../../../../common/types';

export interface CopyExportQueryStepProps {
  status: EuiStepStatus;
  migrationSource: MigrationSource;
  onCopied: () => void;
}

export const useCopyExportQueryStep = ({
  migrationSource,
  status,
  onCopied,
}: CopyExportQueryStepProps): EuiStepProps => {
  const COPY_EXPORT_QUERY_SUPPORTED_SOURCES: Record<MigrationSource, React.ReactNode> = useMemo(
    () => ({
      [MigrationSource.SPLUNK]: <CopyExportedSplunkQuery onCopied={onCopied} />,
      [MigrationSource.QRADAR]: <CopyExportedQradarQuery />,
    }),
    [onCopied]
  );

  return {
    title: i18n.RULES_DATA_INPUT_COPY_TITLE,
    status,
    children: COPY_EXPORT_QUERY_SUPPORTED_SOURCES[migrationSource],
  };
};
