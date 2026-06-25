/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ExportCaseDescriptionProps {
  title: string;
  description: string;
  hasIssues: boolean;
}

export const ExportCaseDescription: React.FC<ExportCaseDescriptionProps> = ({
  title,
  description,
  hasIssues,
}) => {
  if (!hasIssues) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.securitySolution.siemReadiness.export.noIssues.title',
          {
            defaultMessage: 'No issues detected',
          }
        )}
        color="success"
        iconType="check"
        size="s"
      >
        <p>
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.export.noIssues.description',
            {
              defaultMessage: 'All items in this section are healthy.',
            }
          )}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiMarkdownFormat textSize="s">{description}</EuiMarkdownFormat>
    </EuiPanel>
  );
};

ExportCaseDescription.displayName = 'ExportCaseDescription';
