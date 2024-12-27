/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import { CopyExportQuery } from './copy_export_query';
import * as i18n from './translations';

export interface CopyExportQueryStepProps {
  status: EuiStepStatus;
  onCopied: () => void;
}
export const useCopyExportQueryStep = ({
  status,
  onCopied,
}: CopyExportQueryStepProps): EuiStepProps => {
  return {
    title: i18n.RULES_DATA_INPUT_COPY_TITLE,
    status,
    children: <CopyExportQuery onCopied={onCopied} />,
  };
};
