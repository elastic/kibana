/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiBadge,
  EuiButtonIcon,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { paths } from '../../../../../common/locators/paths';

interface HierarchyNode {
  id: string;
  name: string;
  type: 'value-stream' | 'business-component' | 'service';
  slo?: SLOWithSummaryResponse;
  children: HierarchyNode[];
  // Aggregated metrics for parent nodes
  aggregatedSliValue?: number;
  aggregatedStatus?: string;
  aggregatedErrorBudget?: number;
  sloCount?: number;
}

interface Props {
  sloList: SLOWithSummaryResponse[];
  loading?: boolean;
}

/**
 * Builds a hierarchical tree structure from flat SLO list based on tags
 *
 * Tag convention:
 * - value-stream:customer-onboarding
 * - business-component:identity-verification
 * - service:id-scanner-api
 */
export function SloHierarchyTree({ sloList, loading }: Props) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  const hierarchyTree = useMemo(() => buildHierarchyFromTags(sloList), [sloList]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  if (loading) {
    return (
      <EuiPanel>
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (hierarchyTree.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        title={
          <h2>
            {i18n.translate('xpack.slo.hierarchyView.noDataTitle', {
              defaultMessage: 'No hierarchical SLOs found',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.slo.hierarchyView.noDataBody', {
              defaultMessage:
                'Tag your SLOs with value-stream, business-component, and service tags to see the hierarchy.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <EuiPanel hasBorder>
      {hierarchyTree.map((node) => (
        <HierarchyNodeComponent
          key={node.id}
          node={node}
          level={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
        />
      ))}
    </EuiPanel>
  );
}

interface NodeProps {
  node: HierarchyNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
}

function HierarchyNodeComponent({ node, level, expandedNodes, onToggle }: NodeProps) {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const paddingLeft = level * 24;

  const statusColor = getStatusColor(node.aggregatedStatus || node.slo?.summary.status);
  const sliValue = node.aggregatedSliValue ?? node.slo?.summary.sliValue;
  const formattedSli = sliValue ? `${(sliValue * 100).toFixed(2)}%` : 'N/A';

  // Determine which child is causing the most impact
  const worstChild = node.children.length > 0 ? getWorstPerformingChild(node.children) : null;

  // Handle click for service nodes (navigate to SLO details)
  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.id);
    } else if (node.slo) {
      // Navigate to SLO details page
      const sloDetailsUrl = basePath.prepend(
        paths.sloDetails(node.slo.id, node.slo.instanceId, node.slo.remote?.remoteName)
      );
      navigateToUrl(sloDetailsUrl);
    }
  };

  // Determine cursor style
  const cursorStyle = hasChildren ? 'pointer' : node.slo ? 'pointer' : 'default';

  return (
    <div>
      <EuiPanel
        paddingSize="s"
        hasShadow={false}
        hasBorder={false}
        style={{ paddingLeft, cursor: cursorStyle }}
        onClick={handleClick}
        color={node.slo ? 'subdued' : 'plain'}
        data-test-subj={node.slo ? 'sloHierarchyServiceNode' : 'sloHierarchyParentNode'}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {/* Expand/Collapse Icon */}
          <EuiFlexItem grow={false}>
            {hasChildren ? (
              <EuiButtonIcon
                iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
                size="s"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                data-test-subj="sloHierarchyNodeToggle"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
              />
            ) : (
              <div style={{ width: 24 }} />
            )}
          </EuiFlexItem>

          {/* Node Type Icon */}
          <EuiFlexItem grow={false}>
            <EuiIcon type={getNodeIcon(node.type)} size="m" />
          </EuiFlexItem>

          {/* Node Name */}
          <EuiFlexItem grow={true}>
            <EuiText size="s">
              <strong>{node.name}</strong>
              {node.sloCount && node.sloCount > 1 && (
                <EuiBadge color="hollow" style={{ marginLeft: 8 }}>
                  {i18n.translate('xpack.slo.hierarchyView.sloCount', {
                    defaultMessage: '{count} SLOs',
                    values: { count: node.sloCount },
                  })}
                </EuiBadge>
              )}
            </EuiText>
          </EuiFlexItem>

          {/* SLI Value */}
          <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
            <EuiHealth color={statusColor}>
              <strong>{formattedSli}</strong>
            </EuiHealth>
          </EuiFlexItem>

          {/* Status Badge */}
          <EuiFlexItem grow={false}>
            <EuiBadge color={statusColor}>
              {node.aggregatedStatus || node.slo?.summary.status || 'N/A'}
            </EuiBadge>
          </EuiFlexItem>

          {/* Error Budget */}
          {(node.slo?.summary.errorBudget || node.aggregatedErrorBudget !== undefined) && (
            <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
              <EuiToolTip
                content={i18n.translate('xpack.slo.hierarchyView.errorBudgetTooltip', {
                  defaultMessage:
                    node.aggregatedErrorBudget !== undefined
                      ? 'Average error budget remaining'
                      : 'Error budget remaining',
                })}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.slo.hierarchyView.budgetLabel', {
                    defaultMessage: 'Budget: {value}',
                    values: {
                      value:
                        node.slo?.summary.errorBudget?.remaining !== undefined
                          ? `${(node.slo.summary.errorBudget.remaining * 100).toFixed(1)}%`
                          : node.aggregatedErrorBudget !== undefined
                          ? `${(node.aggregatedErrorBudget * 100).toFixed(1)}%`
                          : i18n.translate('xpack.slo.hierarchyView.notAvailable', {
                              defaultMessage: 'N/A',
                            }),
                    },
                  })}
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}

          {/* Impact indicator */}
          {worstChild && (
            <EuiFlexItem grow={false}>
              <EuiIcon
                type="alert"
                color="danger"
                title={i18n.translate('xpack.slo.hierarchyView.impactTooltip', {
                  defaultMessage: 'Worst performing: {childName}',
                  values: { childName: worstChild.name },
                })}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>

      {/* Render children if expanded */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <HierarchyNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {level === 0 && <EuiSpacer size="m" />}
    </div>
  );
}

/**
 * Builds hierarchy from SLO tags
 * Expected tag format: "value-stream:name", "business-component:name", "service:name"
 */
function buildHierarchyFromTags(sloList: SLOWithSummaryResponse[]): HierarchyNode[] {
  const valueStreamMap = new Map<string, HierarchyNode>();

  sloList.forEach((slo) => {
    const tags = slo.tags || [];

    // Extract hierarchy tags
    const valueStreamTag = tags.find((t) => t.startsWith('value-stream:'));
    const businessComponentTag = tags.find((t) => t.startsWith('business-component:'));
    const serviceTag = tags.find((t) => t.startsWith('service:'));

    if (!valueStreamTag && !businessComponentTag && !serviceTag) {
      return; // Skip SLOs without hierarchy tags
    }

    const valueStreamName = valueStreamTag?.split(':')[1] || 'Unassigned';
    const businessComponentName = businessComponentTag?.split(':')[1];
    const serviceName = serviceTag?.split(':')[1] || slo.name;

    // Get or create value stream node
    let valueStream = valueStreamMap.get(valueStreamName);
    if (!valueStream) {
      valueStream = {
        id: `vs-${valueStreamName}`,
        name: formatName(valueStreamName),
        type: 'value-stream',
        children: [],
      };
      valueStreamMap.set(valueStreamName, valueStream);
    }

    if (businessComponentName) {
      // Get or create business component node
      let businessComponent = valueStream.children.find(
        (c) => c.id === `bc-${businessComponentName}`
      );
      if (!businessComponent) {
        businessComponent = {
          id: `bc-${businessComponentName}`,
          name: formatName(businessComponentName),
          type: 'business-component',
          children: [],
        };
        valueStream.children.push(businessComponent);
      }

      // Add service node
      const serviceNode: HierarchyNode = {
        id: `svc-${slo.id}`,
        name: formatName(serviceName),
        type: 'service',
        slo,
        children: [],
      };
      businessComponent.children.push(serviceNode);
    } else {
      // No business component, add service directly to value stream
      const serviceNode: HierarchyNode = {
        id: `svc-${slo.id}`,
        name: formatName(serviceName),
        type: 'service',
        slo,
        children: [],
      };
      valueStream.children.push(serviceNode);
    }
  });

  // Calculate aggregated metrics for parent nodes
  const hierarchy = Array.from(valueStreamMap.values());
  hierarchy.forEach((valueStream) => calculateAggregatedMetrics(valueStream));

  return hierarchy;
}

/**
 * Calculate aggregated metrics for parent nodes (recursive)
 */
function calculateAggregatedMetrics(node: HierarchyNode): void {
  if (node.children.length === 0) {
    // Leaf node, use SLO data directly
    return;
  }

  // First, calculate metrics for all children
  node.children.forEach((child) => calculateAggregatedMetrics(child));

  // Collect all leaf SLOs under this node
  const leafSLOs = collectLeafSLOs(node);

  if (leafSLOs.length === 0) {
    return;
  }

  // Calculate weighted average SLI (could also use min/worst-case)
  const totalWeight = leafSLOs.length;
  const sumSliValues = leafSLOs.reduce((sum, slo) => {
    return sum + (slo.summary.sliValue ?? 0);
  }, 0);

  node.aggregatedSliValue = sumSliValues / totalWeight;
  node.sloCount = leafSLOs.length;

  // Calculate average error budget remaining
  const slosWithBudget = leafSLOs.filter((slo) => slo.summary.errorBudget?.remaining != null);
  if (slosWithBudget.length > 0) {
    const sumBudget = slosWithBudget.reduce((sum, slo) => {
      return sum + (slo.summary.errorBudget.remaining ?? 0);
    }, 0);
    node.aggregatedErrorBudget = sumBudget / slosWithBudget.length;
  }

  // Determine aggregated status based on worst child
  const statuses = leafSLOs.map((slo) => slo.summary.status);
  if (statuses.includes('VIOLATED')) {
    node.aggregatedStatus = 'VIOLATED';
  } else if (statuses.includes('DEGRADING')) {
    node.aggregatedStatus = 'DEGRADING';
  } else if (statuses.includes('HEALTHY')) {
    node.aggregatedStatus = 'HEALTHY';
  } else {
    node.aggregatedStatus = 'NO_DATA';
  }
}

/**
 * Collect all leaf SLOs under a node (recursive)
 */
function collectLeafSLOs(node: HierarchyNode): SLOWithSummaryResponse[] {
  if (node.slo) {
    return [node.slo];
  }

  return node.children.flatMap((child) => collectLeafSLOs(child));
}

/**
 * Find the worst performing child node
 */
function getWorstPerformingChild(children: HierarchyNode[]): HierarchyNode | null {
  if (children.length === 0) return null;

  return children.reduce((worst, child) => {
    const worstSli = worst.aggregatedSliValue ?? worst.slo?.summary.sliValue ?? 1;
    const childSli = child.aggregatedSliValue ?? child.slo?.summary.sliValue ?? 1;
    return childSli < worstSli ? child : worst;
  });
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'VIOLATED':
      return 'danger';
    case 'DEGRADING':
      return 'warning';
    case 'HEALTHY':
      return 'success';
    default:
      return 'subdued';
  }
}

function getNodeIcon(type: HierarchyNode['type']): string {
  switch (type) {
    case 'value-stream':
      return 'branch';
    case 'business-component':
      return 'package';
    case 'service':
      return 'compute';
    default:
      return 'dot';
  }
}

function formatName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
