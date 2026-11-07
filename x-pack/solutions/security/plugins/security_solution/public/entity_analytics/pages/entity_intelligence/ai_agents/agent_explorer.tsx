/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { IntelligencePanel } from '../components';
import { useAgentInventory } from './use_agent_inventory';
import { AgentDossier } from './agent_dossier';
import { ProviderIcon } from './provider_icon';

export const AgentExplorer: React.FC<{
  agentId?: string;
  invocationId?: string;
  onSelect: (agentId: string) => void;
}> = ({ agentId, invocationId, onSelect }) => {
  const inventory = useAgentInventory(useSpaceId());
  const selected = agentId
    ? inventory.agents.find((agent) => agent.id === agentId)
    : inventory.agents[0];

  if (inventory.isLoading) return <EuiSkeletonText lines={8} />;
  if (inventory.definitionsStatus === 'unavailable')
    return (
      <KbnWarningCallout
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.explorerUnavailable',
          {
            defaultMessage:
              'Agent inventory could not be loaded. Check access and return to Entities to retry.',
          }
        )}
      />
    );
  if (!selected && agentId)
    return (
      <KbnWarningCallout
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.explorerSelectionUnavailable',
          {
            defaultMessage: 'The selected agent is unavailable in this space',
          }
        )}
      >
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agents.explorerSelectionUnavailableDescription',
            {
              defaultMessage: 'It may have been removed or you may no longer have access to it.',
            }
          )}
        </p>
        {inventory.agents.length > 0 && (
          <EuiButtonEmpty size="s" onClick={() => onSelect(inventory.agents[0].id)}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.explorerResetSelection',
              {
                defaultMessage: 'Select an available agent',
              }
            )}
          </EuiButtonEmpty>
        )}
      </KbnWarningCallout>
    );
  if (!selected)
    return (
      <KbnInfoCallout
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.explorerEmpty',
          {
            defaultMessage: 'No agents are available in this space.',
          }
        )}
      />
    );

  return (
    <div data-test-subj="entityIntelligenceAgentExplorer">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <ProviderIcon provider="elastic" size={30} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>{selected.name}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.selectAgent',
              {
                defaultMessage: 'Select an AI agent',
              }
            )}
            value={selected.id}
            options={inventory.agents.map((agent) => ({ value: agent.id, text: agent.name }))}
            onChange={(event) => onSelect(event.target.value)}
            data-test-subj="agentExplorerSelect"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <IntelligencePanel>
        <AgentDossier
          key={JSON.stringify([selected.id, invocationId])}
          agent={selected}
          initialInvocationId={invocationId}
        />
      </IntelligencePanel>
    </div>
  );
};
