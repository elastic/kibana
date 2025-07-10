/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { Replacements } from '@kbn/elastic-assistant-common';
import React from 'react';

import { AccordionTitle } from './accordion_title';
import * as i18n from './translations';
import { useKibanaFeatureFlags } from '../../../../../use_kibana_feature_flags';

const AVATAR_SIZE = 24; // px

interface Props {
  connectorName?: string;
  isLoading: boolean;
  replacements?: Replacements;
  showAnonymized?: boolean;
  title: string;
}

const AccordionButtonComponent: React.FC<Props> = ({
  connectorName,
  isLoading,
  replacements,
  showAnonymized = false,
  title,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        gap: ${euiTheme.size.xs};
      `}
      data-test-subj="nonWrapping"
      gutterSize="none"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
        <div
          css={css`
            background-color: ${euiTheme.colors.lightestShade};
            border-radius: 50%;
            display: inline;
            height: ${AVATAR_SIZE}px;
            width: ${AVATAR_SIZE}px;
            overflow: hidden;
          `}
          data-test-subj="assistantAvatarContainer"
        >
          <EuiToolTip
            content={
              attackDiscoveryAlertsEnabled && connectorName != null ? connectorName : undefined
            }
            data-test-subj="connectorTooltip"
            position="right"
            title={
              attackDiscoveryAlertsEnabled && connectorName != null ? i18n.AI_CONNECTOR : undefined
            }
          >
            <AssistantIcon
              css={css`
                transform: translate(5px, -1px);
                overflow: hidden;
              `}
              size="s"
            />
          </EuiToolTip>
        </div>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AccordionTitle
          isLoading={isLoading}
          replacements={replacements}
          showAnonymized={showAnonymized}
          title={title}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AccordionButtonComponent.displayName = 'AccordionButton';

export const AccordionButton = React.memo(AccordionButtonComponent);
