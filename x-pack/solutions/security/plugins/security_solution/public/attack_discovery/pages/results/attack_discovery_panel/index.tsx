/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import {
  type AttackDiscovery,
  type AttackDiscoveryAlert,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import React, { useState } from 'react';

import { useViewInAiAssistant } from './view_in_ai_assistant/use_view_in_ai_assistant';
import { ActionableSummary } from './actionable_summary';
import { PanelHeader } from './panel_header';
import { Tabs } from './tabs';

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
  initialIsOpen?: boolean;
  isSelected: boolean;
  setIsSelected?: ({ id, selected }: { id: string; selected: boolean }) => void;
  setSelectedAttackDiscoveries: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const AttackDiscoveryPanelComponent: React.FC<Props> = ({
  attackDiscovery,
  initialIsOpen,
  isSelected,
  setIsSelected,
  setSelectedAttackDiscoveries,
  onToggle,
  replacements,
  showAnonymized = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const [isOpen, setIsOpen] = useState<'open' | 'closed'>(initialIsOpen ? 'open' : 'closed');

  const viewInAiAssistantOverlay = useViewInAiAssistant({
    attackDiscovery,
    replacements,
  });

  return (
    <>
      <EuiPanel data-test-subj={`attackDiscoveryPanel-${attackDiscovery.id}`} hasBorder={true}>
        <EuiSpacer size="xs" />

        <PanelHeader
          attackDiscovery={attackDiscovery}
          isOpen={isOpen}
          isSelected={isSelected}
          setIsSelected={setIsSelected}
          onToggle={onToggle}
          replacements={replacements}
          setIsOpen={setIsOpen}
          setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
          showAnonymized={showAnonymized}
          viewInAiAssistantOverlay={viewInAiAssistantOverlay}
        />

        <EuiSpacer size="s" />

        <ActionableSummary
          attackDiscovery={attackDiscovery}
          replacements={replacements}
          showAnonymized={showAnonymized}
          viewInAiAssistantOverlay={viewInAiAssistantOverlay}
        />
      </EuiPanel>

      {isOpen === 'open' && (
        <EuiPanel
          css={css`
            border-top: none;
            border-radius: 0 0 6px 6px;
            margin: 0 ${euiTheme.size.m} 0 ${euiTheme.size.m};
          `}
          data-test-subj="attackDiscoveryTabsPanel"
          hasBorder={true}
        >
          <Tabs
            attackDiscovery={attackDiscovery}
            replacements={replacements}
            showAnonymized={showAnonymized}
            viewInAiAssistantOverlay={viewInAiAssistantOverlay}
          />
        </EuiPanel>
      )}
    </>
  );
};

AttackDiscoveryPanelComponent.displayName = 'AttackDiscoveryPanel';

export const AttackDiscoveryPanel = React.memo(AttackDiscoveryPanelComponent);
