/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { IntelligencePanel } from '../components';
import type { AgentInventoryItem } from './types';
import { useAgentInventory } from './use_agent_inventory';
import { AgentTimestamp } from './agent_evidence';
import { AgentDossier } from './agent_dossier';

const PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.agents';

export const AgentInventory: React.FC<{ onInvestigate: (agentId: string) => void }> = ({
  onInvestigate,
}) => {
  const spaceId = useSpaceId();
  const inventory = useAgentInventory(spaceId);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = inventory.agents.find((agent) => agent.id === selectedId);
  const titleId = useGeneratedHtmlId({ prefix: 'agentDossier' });
  const columns: Array<EuiBasicTableColumn<AgentInventoryItem>> = [
    {
      field: 'name',
      name: i18n.translate(`${PREFIX}.agentColumn`, { defaultMessage: 'Agent' }),
      sortable: true,
      width: '20em',
      render: (name: string, agent: AgentInventoryItem) => (
        <div>
          <EuiLink onClick={() => setSelectedId(agent.id)} data-test-subj="agentInventoryName">
            {name}
          </EuiLink>
          <EuiText size="xs" color="subdued">
            <p>{agent.id}</p>
          </EuiText>
        </div>
      ),
    },
    {
      name: i18n.translate(`${PREFIX}.toolsColumn`, { defaultMessage: 'Configured tools' }),
      render: (agent: AgentInventoryItem) => (
        <>
          {agent.configuredTools.length.toLocaleString()}
          {agent.enableElasticCapabilities && (
            <>
              {' · '}
              {i18n.translate(`${PREFIX}.dynamicCapabilities`, {
                defaultMessage: 'Dynamic capabilities',
              })}
            </>
          )}
        </>
      ),
    },
    {
      name: i18n.translate(`${PREFIX}.ownerColumn`, { defaultMessage: 'Created by' }),
      render: (agent: AgentInventoryItem) => agent.owner?.name ?? agent.owner?.id ?? '—',
    },
    {
      name: i18n.translate(`${PREFIX}.invocationsColumn`, {
        defaultMessage: 'Invocations · 30 days',
      }),
      render: (agent: AgentInventoryItem) => agent.activity?.invocations.toLocaleString() ?? '—',
    },
    {
      name: i18n.translate(`${PREFIX}.lastObservedColumn`, { defaultMessage: 'Last observed' }),
      render: (agent: AgentInventoryItem) =>
        agent.activity ? <AgentTimestamp value={agent.activity.lastSeen} /> : '—',
    },
    {
      name: i18n.translate(`${PREFIX}.actionsColumn`, { defaultMessage: 'Actions' }),
      width: '110px',
      render: (agent: AgentInventoryItem) => (
        <EuiButtonEmpty
          size="xs"
          onClick={() => onInvestigate(agent.id)}
          data-test-subj="agentInventoryExplore"
        >
          {i18n.translate(`${PREFIX}.explore`, { defaultMessage: 'Explore' })}
        </EuiButtonEmpty>
      ),
    },
  ];

  return (
    <div data-test-subj="entityIntelligenceAgentInventory">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{i18n.translate(`${PREFIX}.inventoryTitle`, { defaultMessage: 'AI agents' })}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(`${PREFIX}.inventoryDescription`, {
                defaultMessage:
                  'Understand agent capabilities, observed behavior, and the identities behind each execution.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="refresh"
            onClick={inventory.refetch}
            isLoading={inventory.isRefreshing}
          >
            {i18n.translate(`${PREFIX}.refresh`, { defaultMessage: 'Refresh' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {inventory.isLoading ? (
        <EuiSkeletonText lines={6} />
      ) : inventory.definitionsStatus === 'unavailable' ? (
        <KbnWarningCallout
          title={i18n.translate(`${PREFIX}.inventoryUnavailable`, {
            defaultMessage: 'Agent inventory unavailable',
          })}
        >
          <p>
            {i18n.translate(`${PREFIX}.inventoryUnavailableDescription`, {
              defaultMessage:
                'Agent Builder could not return the agents available to you. Check access and retry.',
            })}
          </p>
        </KbnWarningCallout>
      ) : (
        <>
          {inventory.status === 'partial' && (
            <>
              <KbnWarningCallout
                size="s"
                title={i18n.translate(`${PREFIX}.inventoryPartial`, {
                  defaultMessage:
                    'Some tool or activity information is unavailable. Missing values are shown as a dash.',
                })}
              />
              <EuiSpacer size="m" />
            </>
          )}
          <IntelligencePanel>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate(`${PREFIX}.inventoryCount`, {
                      defaultMessage:
                        '{count, number} registered {count, plural, one {agent} other {agents}}',
                      values: { count: inventory.agents.length },
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate(`${PREFIX}.inventorySource`, {
                    defaultMessage: 'Agent Builder · current space',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiInMemoryTable
              items={inventory.agents}
              columns={columns}
              itemId="id"
              pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
              sorting={{ sort: { field: 'name', direction: 'asc' } }}
              search={{
                box: {
                  incremental: true,
                  schema: true,
                  placeholder: i18n.translate(`${PREFIX}.searchAgents`, {
                    defaultMessage: 'Search agents',
                  }),
                },
              }}
              noItemsMessage={i18n.translate(`${PREFIX}.noAgents`, {
                defaultMessage: 'No agents match this view.',
              })}
              tableCaption={i18n.translate(`${PREFIX}.tableCaption`, {
                defaultMessage: 'AI agents available in this space',
              })}
            />
          </IntelligencePanel>
          <EuiSpacer size="m" />
          <KbnInfoCallout
            size="s"
            title={i18n.translate(`${PREFIX}.riskNotScored`, {
              defaultMessage: 'Agent risk is not scored yet',
            })}
          >
            <p>
              {i18n.translate(`${PREFIX}.riskNotScoredDescription`, {
                defaultMessage:
                  'Activity comes from recorded agent invocations. Collection gaps, privacy settings, or no observations do not establish low risk.',
              })}
            </p>
          </KbnInfoCallout>
        </>
      )}
      {selected && inventory.definitionsStatus !== 'unavailable' && (
        <EuiFlyout size="m" onClose={() => setSelectedId(undefined)} aria-labelledby={titleId}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={titleId}>{selected.name}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <AgentDossier agent={selected} onInvestigate={() => onInvestigate(selected.id)} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </div>
  );
};
