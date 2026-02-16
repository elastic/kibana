/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useDiscoverSlos } from '../../../../hooks/use_discover_slos';
import type { ProposedSlo } from '../../../../hooks/use_discover_slos';
import { useBulkCreateSlos } from '../../../../hooks/use_bulk_create_slos';
import { useKibana } from '../../../../hooks/use_kibana';
import { normalizeForCreate } from '../../../../utils/normalize_slo_for_create';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { DiscoveredSloCard } from './discovered_slo_card';

export function SloDiscoverForm() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const [proposals, setProposals] = useState<ProposedSlo[]>([]);
  const [summary, setSummary] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [hasDiscovered, setHasDiscovered] = useState(false);

  const discoverMutation = useDiscoverSlos();
  const { mutate: bulkCreate, isLoading: isCreating, batchProgress, abort: abortBulkCreate } =
    useBulkCreateSlos();

  const handleDiscover = useCallback(() => {
    discoverMutation.mutate(
      {},
      {
        onSuccess: (response) => {
          setProposals(response.proposedSlos);
          setSummary(response.summary);
          setHasDiscovered(true);
          const allIndices = new Set<number>(
            response.proposedSlos
              .filter((p) => p.priority === 'critical' || p.priority === 'high')
              .map((_, idx) => idx)
          );
          setSelectedIndices(allIndices);
        },
      }
    );
  }, [discoverMutation]);

  const handleToggleSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIndices(new Set(proposals.map((_, idx) => idx)));
  }, [proposals]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const handleCreateSelected = useCallback(() => {
    const selectedSlos = proposals
      .filter((_, idx) => selectedIndices.has(idx))
      .map((p) => normalizeForCreate(p.sloDefinition));

    bulkCreate(
      { slos: selectedSlos },
      {
        onSuccess: () => {
          navigateToUrl(basePath.prepend(paths.slos));
        },
      }
    );
  }, [proposals, selectedIndices, bulkCreate, navigateToUrl, basePath]);

  const isDiscovering = discoverMutation.isLoading;

  const priorityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of proposals) {
      if (p.priority in counts) {
        counts[p.priority as keyof typeof counts]++;
      }
    }
    return counts;
  }, [proposals]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of proposals) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [proposals]);

  if (!hasDiscovered) {
    return (
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder data-test-subj="sloDiscoverForm">
        <EuiEmptyPrompt
          iconType="magnifyWithPlus"
          title={
            <h3>
              {i18n.translate('xpack.slo.discover.emptyTitle', {
                defaultMessage: 'Auto-discover SLOs from your data',
              })}
            </h3>
          }
          body={
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.slo.discover.emptyDescription', {
                  defaultMessage:
                    'Scan your cluster to automatically identify APM services, synthetics monitors, log streams, and metric sources. AI will analyze your data and propose user-centric SLOs following SRE best practices. Review the proposals and create them all with one click.',
                })}
              </p>
            </EuiText>
          }
          actions={
            <EuiButton
              fill
              iconType="sparkles"
              onClick={handleDiscover}
              isLoading={isDiscovering}
              data-test-subj="sloDiscoverButton"
            >
              {i18n.translate('xpack.slo.discover.scanButton', {
                defaultMessage: 'Scan cluster & discover SLOs',
              })}
            </EuiButton>
          }
        />
        {isDiscovering && (
          <>
            <EuiSpacer size="m" />
            <EuiProgress size="xs" color="primary" />
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" textAlign="center">
              <p>
                {i18n.translate('xpack.slo.discover.scanning', {
                  defaultMessage:
                    'Scanning your cluster for APM services, synthetics monitors, logs, and metrics...',
                })}
              </p>
            </EuiText>
          </>
        )}
      </EuiPanel>
    );
  }

  if (proposals.length === 0) {
    return (
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder data-test-subj="sloDiscoverForm">
        <EuiCallOut
          title={i18n.translate('xpack.slo.discover.noProposals', {
            defaultMessage: 'No SLOs discovered',
          })}
          color="warning"
          iconType="alert"
        >
          <p>
            {i18n.translate('xpack.slo.discover.noProposalsDescription', {
              defaultMessage:
                'No data sources suitable for SLO creation were found in your cluster. Ensure you have APM, synthetics, or log data being ingested.',
            })}
          </p>
          <EuiSpacer size="s" />
          <EuiButton
            onClick={handleDiscover}
            isLoading={isDiscovering}
            iconType="refresh"
            size="s"
          >
            {i18n.translate('xpack.slo.discover.retryButton', {
              defaultMessage: 'Retry scan',
            })}
          </EuiButton>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="l" hasShadow={false} hasBorder data-test-subj="sloDiscoverForm">
      <EuiFlexGroup direction="column" gutterSize="l">
        {/* Summary section */}
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.slo.discover.resultsTitle', {
                defaultMessage: 'Discovered {count} {count, plural, one {SLO} other {SLOs}}',
                values: { count: proposals.length },
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{summary}</p>
          </EuiText>
        </EuiFlexItem>

        {/* Stats row */}
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiStat
                title={priorityCounts.critical}
                description={i18n.translate('xpack.slo.discover.stats.critical', {
                  defaultMessage: 'Critical',
                })}
                titleColor="danger"
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={priorityCounts.high}
                description={i18n.translate('xpack.slo.discover.stats.high', {
                  defaultMessage: 'High',
                })}
                titleColor="warning"
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={priorityCounts.medium + priorityCounts.low}
                description={i18n.translate('xpack.slo.discover.stats.other', {
                  defaultMessage: 'Medium / Low',
                })}
                titleColor="primary"
                titleSize="s"
              />
            </EuiFlexItem>
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <EuiFlexItem key={cat}>
                <EuiStat
                  title={count}
                  description={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  titleSize="s"
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Selection controls */}
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={handleSelectAll}
                    data-test-subj="sloDiscoverSelectAll"
                  >
                    {i18n.translate('xpack.slo.discover.selectAll', {
                      defaultMessage: 'Select all',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={handleDeselectAll}
                    data-test-subj="sloDiscoverDeselectAll"
                  >
                    {i18n.translate('xpack.slo.discover.deselectAll', {
                      defaultMessage: 'Deselect all',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.slo.discover.selectedCount', {
                  defaultMessage: '{selected} of {total} selected',
                  values: { selected: selectedIndices.size, total: proposals.length },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* SLO proposal cards */}
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            {proposals.map((proposal, index) => (
              <EuiFlexItem key={index}>
                <DiscoveredSloCard
                  proposal={proposal}
                  index={index}
                  isSelected={selectedIndices.has(index)}
                  onToggle={handleToggleSelection}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Action buttons */}
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleDiscover}
                isLoading={isDiscovering}
                iconType="refresh"
                data-test-subj="sloDiscoverRescanButton"
              >
                {i18n.translate('xpack.slo.discover.rescanButton', {
                  defaultMessage: 'Re-scan cluster',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="check"
                onClick={handleCreateSelected}
                isLoading={isCreating}
                disabled={selectedIndices.size === 0}
                data-test-subj="sloDiscoverCreateButton"
              >
                {i18n.translate('xpack.slo.discover.createButton', {
                  defaultMessage:
                    'Create {count} {count, plural, one {SLO} other {SLOs}}',
                  values: { count: selectedIndices.size },
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Batch creation progress */}
        {isCreating && batchProgress && (
          <EuiFlexItem>
            <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>
                          {i18n.translate('xpack.slo.discover.batchProgress', {
                            defaultMessage:
                              'Creating batch {current} of {total}...',
                            values: {
                              current: batchProgress.currentBatch,
                              total: batchProgress.totalBatches,
                            },
                          })}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiProgress
                    value={batchProgress.completedSlos}
                    max={batchProgress.totalSlos}
                    size="m"
                    color="primary"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="l" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.slo.discover.batchCompleted', {
                          defaultMessage:
                            '{completed} of {total} SLOs processed',
                          values: {
                            completed: batchProgress.completedSlos,
                            total: batchProgress.totalSlos,
                          },
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    {batchProgress.successCount > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="success">
                          {i18n.translate('xpack.slo.discover.batchSuccessCount', {
                            defaultMessage: '{count} succeeded',
                            values: { count: batchProgress.successCount },
                          })}
                        </EuiText>
                      </EuiFlexItem>
                    )}
                    {batchProgress.failureCount > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="danger">
                          {i18n.translate('xpack.slo.discover.batchFailureCount', {
                            defaultMessage: '{count} failed',
                            values: { count: batchProgress.failureCount },
                          })}
                        </EuiText>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        color="danger"
                        onClick={abortBulkCreate}
                        data-test-subj="sloDiscoverAbortButton"
                      >
                        {i18n.translate('xpack.slo.discover.abortButton', {
                          defaultMessage: 'Stop after current batch',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
