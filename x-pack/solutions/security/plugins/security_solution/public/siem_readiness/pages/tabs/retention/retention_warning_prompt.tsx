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

const ILM_DOCS_URL =
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html';

export const RetentionWarningPrompt: React.FC = () => {
  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate(
        'xpack.securitySolution.siemReadiness.retention.warningPrompt.title',
        {
          defaultMessage: 'Some indices have shorter retention periods than recommended.',
        }
      )}
      color="warning"
      iconType="warning"
      size="s"
    >
      <p>
        <FormattedMessage
          id="xpack.securitySolution.siemReadiness.retention.warningPrompt.description"
          defaultMessage="Review and update any FedRAMP non-compliant ILM policies. You can create a case to track this work and complete it later if needed. Learn more in our {docs}."
          values={{
            docs: (
              <EuiLink href={ILM_DOCS_URL} target="_blank" external>
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.retention.warningPrompt.docsLink',
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
