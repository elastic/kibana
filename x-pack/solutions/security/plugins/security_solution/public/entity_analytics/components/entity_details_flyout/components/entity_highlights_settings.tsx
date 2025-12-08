/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiContextMenuPanel,
  EuiPopover,
  EuiButtonIcon,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';

interface EntityHighlightsSettingsProps {
  showAnonymizedValues: boolean;
  onChangeShowAnonymizedValues: (event: EuiSwitchEvent) => void;
  setConnectorId: (id: string) => void;
  connectorId: string;
  assistantResult: {
    aiResponse?: string;
    replacements?: Record<string, string>;
    formattedEntitySummary?: string;
    generatedAt?: number;
  } | null;
  closePopover: () => void;
  openPopover: () => void;
  isLoading: boolean;
  isPopoverOpen: boolean;
}

export const EntityHighlightsSettings: React.FC<EntityHighlightsSettingsProps> = ({
  showAnonymizedValues,
  onChangeShowAnonymizedValues,
  setConnectorId,
  connectorId,
  closePopover,
  openPopover,
  isLoading,
  isPopoverOpen,
  assistantResult,
}) => {
  const selectedConversationHasAnonymizedValues = useMemo(
    () => !isEmpty(assistantResult?.replacements),
    [assistantResult?.replacements]
  );

  const items = useMemo(
    () => [
      <EuiPanel color="transparent" paddingSize="none" key={'entity-highlights-settings-menu'}>
        <EuiContextMenuItem
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.anonymizeValuesAriaLabel',
            {
              defaultMessage: 'Show anonymized values',
            }
          )}
          key="anonymize-values"
        >
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.highlights.showAnonymizedValues',
                  {
                    defaultMessage: 'Show anonymized values',
                  }
                )}
                checked={showAnonymizedValues}
                onChange={onChangeShowAnonymizedValues}
                compressed
                disabled={!selectedConversationHasAnonymizedValues}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>

        <EuiContextMenuItem
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.connectorSelectorAriaLabel',
            {
              defaultMessage: 'Connector selector',
            }
          )}
        >
          <ConnectorSelectorInline
            onConnectorSelected={noop}
            onConnectorIdSelected={setConnectorId}
            selectedConnectorId={connectorId}
          />
        </EuiContextMenuItem>
      </EuiPanel>,
    ],
    [
      showAnonymizedValues,
      onChangeShowAnonymizedValues,
      selectedConversationHasAnonymizedValues,
      setConnectorId,
      connectorId,
    ]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.openMenuAriaLabel',
            {
              defaultMessage: 'Entity highlights settings menu',
            }
          )}
          iconType="boxesVertical"
          onClick={openPopover}
          disabled={isLoading}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
    >
      <EuiContextMenuPanel
        items={items}
        css={css`
          width: 280px;
        `}
      />
    </EuiPopover>
  );
};
