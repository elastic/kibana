/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface AISummarySectionSettingsProps {
  showAnonymized: boolean;
  onChangeShowAnonymized: (event: EuiSwitchEvent) => void;
  closePopover: () => void;
  openPopover: () => void;
  isPopoverOpen: boolean;
  /** When false, the anonymized markdown toggle has no effect */
  hasAnonymizedContent: boolean;
}

export const AISummarySectionSettings: React.FC<AISummarySectionSettingsProps> = ({
  showAnonymized,
  onChangeShowAnonymized,
  closePopover,
  openPopover,
  isPopoverOpen,
  hasAnonymizedContent,
}) => {
  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            key: 'ai-summary-settings-options-title',
            renderItem: () => (
              <EuiPopoverTitle
                paddingSize="s"
                aria-label={i18n.translate(
                  'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.optionsMenuTitle.ariaLabel',
                  {
                    defaultMessage: 'Options',
                  }
                )}
              >
                <EuiText size="xs">
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.optionsMenuTitle"
                      defaultMessage="Options"
                    />
                  </strong>
                </EuiText>
              </EuiPopoverTitle>
            ),
          },
          {
            key: 'ai-summary-show-anonymized',
            renderItem: () => (
              <EuiContextMenuItem
                aria-label={i18n.translate(
                  'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.showAnonymizedAriaLabel',
                  {
                    defaultMessage: 'Show anonymized values',
                  }
                )}
              >
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      checked={showAnonymized}
                      compressed
                      data-test-subj="overview-tab-toggle-anonymized"
                      label={
                        <FormattedMessage
                          id="xpack.securitySolution.attackDetailsFlyout.overview.AISummary.showAnonymizedLabel"
                          defaultMessage="Show anonymized values"
                        />
                      }
                      onChange={onChangeShowAnonymized}
                      disabled={!hasAnonymizedContent}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiContextMenuItem>
            ),
          },
        ],
      },
    ],
    [hasAnonymizedContent, onChangeShowAnonymized, showAnonymized]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.securitySolution.attackDetailsFlyout.overview.AISummary.openMenuAriaLabel',
            {
              defaultMessage: 'Attack summary settings menu',
            }
          )}
          data-test-subj="overview-tab-ai-summary-settings-menu"
          iconType="boxesVertical"
          onClick={openPopover}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
    >
      <EuiContextMenu
        css={css`
          width: 280px;
        `}
        initialPanelId={0}
        size="m"
        panels={panels}
      />
    </EuiPopover>
  );
};
