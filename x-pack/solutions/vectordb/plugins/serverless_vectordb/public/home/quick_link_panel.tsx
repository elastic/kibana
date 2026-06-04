/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

interface QuickLinkPanelProps {
  title: string;
  href: string;
  telemetryId?: string;
  testSubj?: string;
}

export const QuickLinkPanel = ({ title, href, telemetryId, testSubj }: QuickLinkPanelProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCard
      title={
        <EuiScreenReaderOnly>
          <span>{title}</span>
        </EuiScreenReaderOnly>
      }
      href={href}
      target="_blank"
      hasBorder
      paddingSize="s"
      layout="horizontal"
      data-test-subj={testSubj}
      data-telemetry-id={telemetryId}
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="flexStart"
        direction="column"
        responsive={false}
        css={css`
          height: 100%;
          padding: 0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s};
        `}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiIcon size="m" type="documentation" aria-hidden={true} />
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >
            <FormattedMessage
              id="xpack.serverlessVectordb.quickLinkPanel.topicLabel"
              defaultMessage="Topic"
            />
          </EuiText>
        </EuiFlexGroup>
        <EuiTitle size="xxs">
          <span aria-hidden="true">{title}</span>
        </EuiTitle>
      </EuiFlexGroup>
    </EuiCard>
  );
};
