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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { quickLinkInnerStyle, quickLinkBoldLabelStyle } from './quick_link_panel_styles';

interface QuickLinkPanelProps {
  title: string;
  href: string;
  telemetryId?: string;
  testSubj?: string;
}

export const QuickLinkPanel = ({ title, href, telemetryId, testSubj }: QuickLinkPanelProps) => {
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
        css={quickLinkInnerStyle}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiIcon size="m" type="documentation" aria-hidden={true} />
          <EuiText size="xs" color="subdued" css={quickLinkBoldLabelStyle}>
            <FormattedMessage
              id="xpack.serverlessVectordb.quickLinkPanel.topicLabel"
              defaultMessage="Topic"
            />
          </EuiText>
        </EuiFlexGroup>
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexGroup>
    </EuiCard>
  );
};
