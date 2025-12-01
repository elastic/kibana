/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverFooter,
  EuiButton,
  useEuiTheme,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_APP_ID, AGENT_BUILDER_AGENTS_CREATE } from '@kbn/deeplinks-agent-builder';
import { AGENT_BUILDER_AGENTS } from '../../../../common';
import { useAgents } from '../../hooks/use_agents';
import { useNavigateToApp } from '../../hooks/use_navigate_to_app';

const agentSelectId = 'workplaceAIAgentSelect';

const labels = {
  selectAgent: i18n.translate('xpack.workplaceai.agentSelector.selectAgent', {
    defaultMessage: 'Select agent',
  }),
  agents: i18n.translate('xpack.workplaceai.agentSelector.agents', {
    defaultMessage: 'Agents',
  }),
  manageAgents: i18n.translate('xpack.workplaceai.agentSelector.manageAgents', {
    defaultMessage: 'Manage agents',
  }),
  createAgent: i18n.translate('xpack.workplaceai.agentSelector.createAgent', {
    defaultMessage: 'Create an agent',
  }),
  noAgentsAvailable: i18n.translate('xpack.workplaceai.agentSelector.noAgentsAvailable', {
    defaultMessage: 'No agents available',
  }),
};

interface AgentSelectorProps {
  selectedAgentId?: string;
  onAgentChange: (agentId: string) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ selectedAgentId, onAgentChange }) => {
  const { euiTheme } = useEuiTheme();
  const { data: agents = [], isLoading } = useAgents();
  const navigateToApp = useNavigateToApp();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  const options: EuiSelectableOption[] = useMemo(
    () =>
      agents.map((agent) => ({
        key: agent.id,
        label: agent.name,
        checked: agent.id === selectedAgentId ? 'on' : undefined,
      })),
    [agents, selectedAgentId]
  );

  const handleAgentChange = useCallback(
    (value: EuiSelectableOption[]) => {
      const newAgentId = value.find((v) => v.checked === 'on')?.key;
      if (newAgentId) {
        onAgentChange(newAgentId);
        setIsPopoverOpen(false);
      }
    },
    [onAgentChange]
  );

  const handleManageAgentsClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigateToApp(`${AGENT_BUILDER_APP_ID}:${AGENT_BUILDER_AGENTS}`);
      setIsPopoverOpen(false);
    },
    [navigateToApp]
  );

  const handleCreateAgentClick = useCallback(() => {
    navigateToApp(`${AGENT_BUILDER_APP_ID}:${AGENT_BUILDER_AGENTS_CREATE}`);
    setIsPopoverOpen(false);
  }, [navigateToApp]);

  const panelStyles = css`
    inline-size: calc(${euiTheme.size.xxl} * 7);
  `;

  const button = (
    <EuiButtonEmpty
      iconSide="right"
      flush="both"
      iconType={isLoading ? undefined : 'arrowDown'}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      aria-haspopup="menu"
      aria-labelledby={agentSelectId}
      data-test-subj="workplaceAIAgentSelectorButton"
      disabled={isLoading || agents.length === 0}
    >
      {isLoading ? <EuiLoadingSpinner size="s" /> : selectedAgent?.name || labels.noAgentsAvailable}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
      panelPaddingSize="none"
      button={button}
      isOpen={isPopoverOpen}
      anchorPosition="upRight"
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiSelectable
        id={agentSelectId}
        aria-label={labels.selectAgent}
        searchable={false}
        options={options}
        onChange={handleAgentChange}
        singleSelection
      >
        {(list) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText
                    css={css`
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                    size="xs"
                  >
                    {labels.agents}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <EuiLink onClick={handleManageAgentsClick}>{labels.manageAgents}</EuiLink>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiButton
                iconSide="left"
                iconType="plus"
                size="s"
                fullWidth
                onClick={handleCreateAgentClick}
              >
                {labels.createAgent}
              </EuiButton>
            </EuiPopoverFooter>
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
