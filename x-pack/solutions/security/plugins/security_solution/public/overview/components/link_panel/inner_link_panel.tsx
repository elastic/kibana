/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiSplitPanel, EuiText } from '@elastic/eui';
import * as i18n from './translations';

const ButtonContainer = styled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.eui.euiSizeS};
`;

const Icon = styled(EuiIcon)`
  padding: 0;
  margin-top: ${({ theme }) => theme.eui.euiSizeM};
  margin-left: 12px;
  transform: scale(${({ color }) => (color === 'primary' ? 1.4 : 1)});
`;

const PanelContainer = styled(EuiSplitPanel.Inner)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeM};
`;

const Title = styled(EuiText)<{ textcolor: 'primary' | 'warning' }>`
  color: ${({ theme, textcolor }) =>
    textcolor === 'primary' ? theme.eui.euiColorPrimary : theme.eui.euiColorWarningText};
  margin-bottom: ${({ theme }) => theme.eui.euiSizeM};
`;

export const InnerLinkPanel = ({
  body,
  button,
  color,
  dataTestSubj,
  learnMoreLink,
  title,
}: {
  body: string;
  button?: JSX.Element;
  color: 'primary' | 'warning';
  dataTestSubj: string;
  learnMoreLink?: string;
  title: string;
}) => (
  <PanelContainer grow={false} color={color}>
    <EuiFlexGroup direction="column" data-test-subj={dataTestSubj}>
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <Icon type={color === 'primary' ? 'iInCircle' : 'help'} size="m" color={color} />
          <EuiFlexItem>
            <Title data-test-subj="inner-link-panel-title" textcolor={color}>
              {title}
            </Title>
          </EuiFlexItem>
        </EuiFlexGroup>
        <p>
          {body}{' '}
          {learnMoreLink && (
            <EuiLink
              href={learnMoreLink}
              target="_blank"
              data-test-subj={`${dataTestSubj}-learn-more`}
              external
            >
              {i18n.LEARN_MORE}
            </EuiLink>
          )}
        </p>
      </EuiFlexItem>
      {button && (
        <ButtonContainer>
          <EuiFlexItem grow={false}>{button}</EuiFlexItem>
        </ButtonContainer>
      )}
    </EuiFlexGroup>
  </PanelContainer>
);

InnerLinkPanel.displayName = 'InnerLinkPanel';
