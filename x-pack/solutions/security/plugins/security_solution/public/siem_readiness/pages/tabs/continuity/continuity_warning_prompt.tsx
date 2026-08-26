/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const INGEST_PIPELINES_DOCS_URL = 'https://www.elastic.co/docs/manage-data/ingest';

export const ContinuityWarningPrompt: React.FC = () => {
  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('xpack.securitySolution.siemReadiness.continuity.warningPrompt.title', {
        defaultMessage: 'Ingest pipeline failures were detected in your environment.',
      })}
      color="warning"
      iconType="warning"
      size="s"
    >
      <p>
        <FormattedMessage
          id="xpack.securitySolution.siemReadiness.continuity.warningPrompt.description"
          defaultMessage="One or more pipelines are reporting ingest failures. Click View failures to investigate the failing pipelines in Stack Management, or create a case to generate a task reminder to complete this later. View our {docs} to learn more about ingest pipeline failures."
          values={{
            docs: (
              <EuiLink href={INGEST_PIPELINES_DOCS_URL} target="_blank" external>
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.continuity.warningPrompt.docsLink',
                  {
                    defaultMessage: 'docs',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
