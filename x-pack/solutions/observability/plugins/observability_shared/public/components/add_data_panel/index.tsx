/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTheme } from '../../hooks/use_theme';

interface AddDataPanelContent {
  title: string;
  content: string;
  img?: {
    name: string;
    baseFolderPath: string;
    position: 'inside' | 'below';
  };
}

interface AddDataPanelButton {
  href: string | undefined;
  label?: string;
}

type AddDataPanelButtonWithLabel = Required<AddDataPanelButton>;

export interface AddDataPanelProps {
  content: AddDataPanelContent;
  onDismiss?: () => void;
  onAddData: () => void;
  onTryIt?: () => void;
  onLearnMore: () => void;
  actions: {
    primary: AddDataPanelButtonWithLabel;
    secondary?: AddDataPanelButton;
    link: AddDataPanelButton;
  };
  'data-test-subj'?: string;
}

const tryItDefaultLabel = i18n.translate(
  'xpack.observabilityShared.addDataPabel.tryItButtonLabel',
  {
    defaultMessage: 'Try it now in our demo cluster',
  }
);

const learnMoreDefaultLabel = i18n.translate(
  'xpack.observabilityShared.addDataPabel.learnMoreLinkLabel',
  {
    defaultMessage: 'Learn more',
  }
);

export function AddDataPanel({
  content,
  actions,
  onDismiss,
  onLearnMore,
  onTryIt,
  onAddData,
  'data-test-subj': dataTestSubj,
}: AddDataPanelProps) {
  const { euiTheme } = useEuiTheme();
  const theme = useTheme();
  const imgSrc = `${content.img?.baseFolderPath}/${theme.darkMode ? 'dark' : 'light'}/${
    content.img?.name
  }`;

  return (
    <>
      <EuiPanel
        color="subdued"
        paddingSize="xl"
        style={{ position: 'relative' }}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{content.title}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{content.content}</EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="m">
              {actions.primary.href && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="AddDataPanelAddDataButton"
                    fill
                    href={actions.primary.href}
                    onClick={onAddData}
                  >
                    {actions.primary.label}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {actions.secondary?.href && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="AddDataPanelTryItNowButton"
                    iconType="launch"
                    iconSide="right"
                    href={actions.secondary.href}
                    onClick={onTryIt}
                    target="_blank"
                  >
                    {actions.secondary.label || tryItDefaultLabel}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {actions.link?.href && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={actions.link.href}
                    onClick={onLearnMore}
                    target="_blank"
                    data-test-subj="AddDataPanelLearnMoreButton"
                    external
                  >
                    {actions.link.label || learnMoreDefaultLabel}
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {content.img && content.img?.position === 'inside' && (
            <EuiFlexItem
              style={{
                maxHeight: `${euiTheme.base * 16}px`,
                overflow: 'hidden',
                borderRadius: `${euiTheme.border.radius.medium}`,
                border: `${euiTheme.border.thin}`,
              }}
            >
              <EuiImage src={imgSrc} alt={content.content} />
            </EuiFlexItem>
          )}

          {onDismiss && (
            <EuiButtonIcon
              style={{
                position: 'absolute',
                top: `${euiTheme.size.s}`,
                right: `${euiTheme.size.s}`,
              }}
              data-test-subj="AddDataPanelDismissButton"
              iconType="cross"
              onClick={onDismiss}
            />
          )}
        </EuiFlexGroup>
      </EuiPanel>
      {content.img && content.img?.position === 'below' && (
        <>
          <EuiSpacer size="l" />
          <EuiImage src={imgSrc} alt={content.content} size="fullWidth" style={{ opacity: 0.4 }} />
        </>
      )}
    </>
  );
}
