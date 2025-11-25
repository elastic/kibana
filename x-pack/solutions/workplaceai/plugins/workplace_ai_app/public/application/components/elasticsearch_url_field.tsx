/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ElasticsearchUrlFieldProps {
  value: string;
  dataTestSubj?: string;
  copyValueDataTestSubj?: string;
}

export const ElasticsearchUrlField: React.FC<ElasticsearchUrlFieldProps> = ({
  value,
  dataTestSubj,
  copyValueDataTestSubj,
}) => {
  return (
    <EuiFlexGroup
      css={({ euiTheme }) => ({
        color: euiTheme.colors.textParagraph,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: euiTheme.border.radius.small,
      })}
      alignItems="center"
      gutterSize="xs"
      responsive={false}
    >
      <EuiFlexItem css={{ minWidth: 0 }} grow={false}>
        <code
          data-test-subj={dataTestSubj}
          css={({ euiTheme }) => ({
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: euiTheme.size.m,
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
          })}
        >
          {value}
        </code>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy
          textToCopy={value}
          afterMessage={i18n.translate(
            'xpack.workplaceai.gettingStarted.elasticsearchUrlField.copyAfterMessage',
            {
              defaultMessage: 'Copied',
            }
          )}
        >
          {(copy) => (
            <EuiButtonIcon
              size="s"
              display="empty"
              onClick={copy}
              iconType="copy"
              color="text"
              data-test-subj={copyValueDataTestSubj}
              aria-label={i18n.translate(
                'xpack.workplaceai.gettingStarted.elasticsearchUrlField.copyAriaLabel',
                {
                  defaultMessage: 'Copy to clipboard',
                }
              )}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
