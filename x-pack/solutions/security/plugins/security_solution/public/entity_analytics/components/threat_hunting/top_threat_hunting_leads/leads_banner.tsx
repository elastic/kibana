/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import * as i18n from './translations';
import illustrationThreat from '../../../../common/images/illustration_threat.svg';
import illustrationThreatDark from '../../../../common/images/illustration_threat_dark.svg';

interface LeadsBannerProps {
  description: React.ReactNode;
  actions?: React.ReactNode;
  isLoading?: boolean;
  'data-test-subj'?: string;
}

/**
 * Slim, single-row banner used for all "no leads" states of the threat
 * hunting leads panel (no connector, empty, generating, no data). This is a
 * lighter-weight adaptation of `EuiBanner`: it reuses the same visual tokens
 * (thin border, medium border radius, plain background, square media slot)
 * but lays everything out in one row instead of `EuiBanner`'s
 * title-then-text stack, so it can host the AI sparkle icon and Tech Preview
 * badge inline with the title, and a description + actions on the trailing
 * edge.
 */
export const LeadsBanner: React.FC<LeadsBannerProps> = ({
  description,
  actions,
  isLoading,
  'data-test-subj': dataTestSubj = 'leadsBanner',
}) => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();
  const plainBackground = useEuiBackgroundColor('plain');
  const illustration = isDarkMode ? illustrationThreatDark : illustrationThreat;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      wrap
      data-test-subj={dataTestSubj}
      css={{
        border: euiTheme.border.thin,
        borderRadius: euiTheme.border.radius.medium,
        backgroundColor: plainBackground,
        padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
        margin: 0,
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiImage size={32} alt="" url={illustration} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h3 className="eui-textNoWrap">{i18n.THREAT_HUNTING_LEADS_BANNER_TITLE}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AiIcon iconType="sparkles" size="m" aria-label="AI Assistant" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label="Tech Preview"
          iconType="flask"
          aria-hidden={true}
          tooltipContent={i18n.EXPERIMENTAL_TOOLTIP}
        />
      </EuiFlexItem>
      <EuiFlexItem />
      {isLoading && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" data-test-subj="leadsLoadingSpinner" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      </EuiFlexItem>
      {actions && (
        // `margin-left: auto` keeps the actions flush with the right edge of
        // their own flex line, so they stay right-aligned even when they wrap
        // onto a new line below the title/description on narrow screens.
        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            wrap
            justifyContent="flexEnd"
          >
            {actions}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
