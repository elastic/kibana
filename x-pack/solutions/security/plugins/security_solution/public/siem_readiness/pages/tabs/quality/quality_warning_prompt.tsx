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

const ECS_DOCS_URL = 'https://www.elastic.co/docs/reference/ecs';

interface QualityWarningPromptProps {
  incompatibleIndicesCount: number;
}

export const QualityWarningPrompt: React.FC<QualityWarningPromptProps> = ({
  incompatibleIndicesCount,
}) => {
  return (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('xpack.securitySolution.siemReadiness.quality.warningPrompt.title', {
        defaultMessage: 'Some indices have ECS compatibility issues.',
      })}
      color="warning"
      iconType="warning"
      size="s"
    >
      <p>
        <FormattedMessage
          id="xpack.securitySolution.siemReadiness.quality.warningPrompt.description"
          defaultMessage="{count, plural, one {# index has} other {# indices have}} ECS compatibility issues. Click View Data quality to review the affected indices and fix field mapping issues. Or, create a case to generate a task reminder to review them later. View our {docs} to learn more about data quality."
          values={{
            count: incompatibleIndicesCount,
            docs: (
              <EuiLink href={ECS_DOCS_URL} target="_blank" external>
                {i18n.translate(
                  'xpack.securitySolution.siemReadiness.quality.warningPrompt.docsLink',
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
