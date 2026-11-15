/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

const headerPanelStyles = css`
  border-end-start-radius: 0;
  border-end-end-radius: 0;
`;

const bodyPanelStyles = css`
  border-start-start-radius: 0;
  border-start-end-radius: 0;
`;

export const SettingsSection = ({
  title,
  titleAdornment,
  children,
  'data-test-subj': dataTestSubject,
}: {
  title: ReactNode;
  titleAdornment?: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}) => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    paddingSize="none"
    grow={false}
    data-test-subj={dataTestSubject}
  >
    <EuiPanel hasShadow={false} color="subdued" paddingSize="m" css={headerPanelStyles}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h3>{title}</h3>
          </EuiText>
        </EuiFlexItem>
        {titleAdornment && <EuiFlexItem grow={false}>{titleAdornment}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiPanel>
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m" css={bodyPanelStyles}>
      {children}
    </EuiPanel>
  </EuiPanel>
);

export const SettingsSectionRow = ({
  title,
  titleAdornment,
  description,
  children,
  'data-test-subj': dataTestSubject,
}: {
  title: ReactNode;
  titleAdornment?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'nightshiftSettingsRowTitle' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'nightshiftSettingsRowDescription' });

  return (
    <EuiFlexGroup
      alignItems="flexStart"
      gutterSize="xl"
      role="group"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-test-subj={dataTestSubject}
    >
      <EuiFlexItem grow={1}>
        {titleAdornment ? (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h4 id={titleId}>{title}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{titleAdornment}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText size="m">
            <h4 id={titleId}>{title}</h4>
          </EuiText>
        )}
        {description && (
          <>
            <EuiSpacer size="xs" />
            <EuiText id={descriptionId} size="s" color="subdued">
              {description}
            </EuiText>
          </>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={1}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
