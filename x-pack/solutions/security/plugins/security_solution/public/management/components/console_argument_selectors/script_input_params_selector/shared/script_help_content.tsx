/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiSpacer, EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface ScriptHelpContentProps {
  description?: React.ReactNode;
  instructions?: React.ReactNode;
  example?: React.ReactNode;
}

export const ScriptHelpContent = memo<ScriptHelpContentProps>(
  ({ description, instructions, example }) => {
    const content = useMemo(() => {
      const data: EuiDescriptionListProps['listItems'] = [];

      if (description) {
        data.push({
          title: i18n.translate('xpack.securitySolution.scriptHelpContent.descriptionLabel', {
            defaultMessage: 'Description',
          }),
          description: (
            <>
              <EuiSpacer size="xs" />
              {description}
              <EuiSpacer size="m" />
            </>
          ),
        });
      }

      if (instructions) {
        data.push({
          title: i18n.translate('xpack.securitySolution.scriptHelpContent.instructionsLabel', {
            defaultMessage: 'Instructions',
          }),
          description: (
            <>
              <EuiSpacer size="xs" />
              {instructions}
              <EuiSpacer size="m" />
            </>
          ),
        });
      }

      if (example) {
        data.push({
          title: i18n.translate('xpack.securitySolution.scriptHelpContent.exampleLabel', {
            defaultMessage: 'Example',
          }),
          description: (
            <>
              <EuiSpacer size="xs" />
              {example}
              <EuiSpacer size="m" />
            </>
          ),
        });
      }

      return data;
    }, [description, example, instructions]);

    return (
      <div>
        <EuiDescriptionList
          listItems={content}
          titleProps={{
            css: css`
              font-weight: unset !important;
              text-decoration: underline !important;
            `,
          }}
        />
      </div>
    );
  }
);
ScriptHelpContent.displayName = 'ScriptHelpContent';
