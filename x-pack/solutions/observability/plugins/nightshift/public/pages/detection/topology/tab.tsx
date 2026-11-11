/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption, EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiComboBox,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_SOURCES_PER_PAGE } from '@kbn/nightshift-shared';
import type { TopologyProvenance } from '@kbn/significant-events-schema';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { useFetchSources } from '../../../data/sources/use_fetch_sources';
import { useTopologySnapshot } from '../../../data/topology/use_topology_snapshot';
import { useProvenanceDetails } from './provenance_details';
import { TopologyGraph, type TopologyGraphSelection } from './topology_graph';
import { buildFullTopology, buildTopologyNeighborhood } from './topology_model';

type TopologyViewMode = 'neighborhood' | 'full';

const allSourcesLabel = i18n.translate('xpack.nightshift.topology.sources.allLabel', {
  defaultMessage: 'All readable sources',
});
const nodeIdLabel = i18n.translate('xpack.nightshift.topology.details.nodeId', {
  defaultMessage: 'Node ID',
});
const subtypeLabel = i18n.translate('xpack.nightshift.topology.details.subtype', {
  defaultMessage: 'Subtype',
});
const technologyLabel = i18n.translate('xpack.nightshift.topology.details.technology', {
  defaultMessage: 'Technology',
});
const protocolLabel = i18n.translate('xpack.nightshift.topology.details.protocol', {
  defaultMessage: 'Protocol',
});
const NO_PROVENANCE: TopologyProvenance[] = [];

const SelectionDetails = ({
  selection,
  sourceTitles,
}: {
  selection: TopologyGraphSelection | undefined;
  sourceTitles: Map<string, string>;
}) => {
  const provenanceItems = useProvenanceDetails(
    (selection?.type === 'node'
      ? selection.node.topologyNode?.provenance
      : selection?.edge.variant.provenance) ?? NO_PROVENANCE,
    sourceTitles
  );

  if (!selection) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.nightshift.topology.details.empty', {
          defaultMessage: 'Select a node or edge to inspect its topology metadata.',
        })}
      </EuiText>
    );
  }

  let title: string;
  let items: EuiDescriptionListProps['listItems'];

  if (selection.type === 'node') {
    const { node } = selection;
    title = node.label;
    items = node.topologyNode
      ? [
          { title: nodeIdLabel, description: node.topologyNode.node_id },
          { title: subtypeLabel, description: node.topologyNode.subtype ?? '—' },
          ...(node.topologyNode.technology
            ? [{ title: technologyLabel, description: node.topologyNode.technology }]
            : []),
          ...provenanceItems,
        ]
      : [
          {
            title: i18n.translate('xpack.nightshift.topology.details.resolution', {
              defaultMessage: 'Resolution',
            }),
            description: (
              <EuiBadge color="warning">
                {i18n.translate('xpack.nightshift.topology.details.unresolved', {
                  defaultMessage: 'Unresolved reference',
                })}
              </EuiBadge>
            ),
          },
        ];
  } else {
    const { edge } = selection;
    const { variant } = edge;
    title = edge.edgeId;
    items = [
      {
        title: i18n.translate('xpack.nightshift.topology.details.source', {
          defaultMessage: 'Source',
        }),
        description: `${variant.source_ref} (${variant.source_resolution})`,
      },
      {
        title: i18n.translate('xpack.nightshift.topology.details.target', {
          defaultMessage: 'Target',
        }),
        description: `${variant.target_ref} (${variant.target_resolution})`,
      },
      { title: subtypeLabel, description: variant.subtype ?? '—' },
      ...(variant.protocol ? [{ title: protocolLabel, description: variant.protocol }] : []),
      ...provenanceItems,
    ];
  }

  return (
    <>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" compressed listItems={items} />
    </>
  );
};

/** `entities` is the selection of the Detections entities list; it focuses the neighborhood view. */
export function TopologyTab({ entities }: { entities: string[] }): React.ReactElement {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<TopologyViewMode>('neighborhood');
  const [hops, setHops] = useState(1);
  const [selection, setSelection] = useState<TopologyGraphSelection>();
  const sourcesQuery = useFetchSources();
  const topologyQuery = useTopologySnapshot(selectedSourceIds);
  const snapshot = topologyQuery.data;

  // Titles are not unique, so a repeated one carries its slug wherever a source is named.
  const sourceTitles = useMemo(() => {
    const titleCounts = new Map<string, number>();
    (sourcesQuery.data ?? []).forEach(({ title }) =>
      titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1)
    );
    return new Map(
      (sourcesQuery.data ?? []).map(({ id, title, slug }) => [
        id,
        (titleCounts.get(title) ?? 0) > 1 ? `${title} (${slug})` : title,
      ])
    );
  }, [sourcesQuery.data]);
  const sourceOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      [...sourceTitles].map(([id, label]) => ({
        key: id,
        label,
        value: id,
        disabled:
          selectedSourceIds.length >= MAX_SOURCES_PER_PAGE && !selectedSourceIds.includes(id),
      })),
    [selectedSourceIds, sourceTitles]
  );
  const selectedSourceOptions = sourceOptions.filter(({ value }) =>
    value ? selectedSourceIds.includes(value) : false
  );

  // A selected entity may sit outside the sources this snapshot was built from.
  const focusedNodeIds = useMemo(() => {
    const nodeIds = new Set((snapshot?.nodes ?? []).map(({ node_id: nodeId }) => nodeId));
    return entities.filter((id) => nodeIds.has(id));
  }, [entities, snapshot?.nodes]);
  useEffect(() => setSelection(undefined), [focusedNodeIds]);
  const isFullView = viewMode === 'full';
  const showGraph = isFullView || focusedNodeIds.length > 0;
  const model = useMemo(() => {
    if (!snapshot) {
      return { nodes: [], edges: [] };
    }
    if (isFullView) {
      return buildFullTopology(snapshot);
    }
    return buildTopologyNeighborhood(snapshot, focusedNodeIds, hops);
  }, [focusedNodeIds, hops, isFullView, snapshot]);

  const updateSources = (options: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedSourceIds(options.flatMap(({ value }) => (value ? [value] : [])));
    setSelection(undefined);
  };

  return (
    <div css={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <EuiFlexGroup alignItems="flexEnd" wrap css={{ flexGrow: 0 }}>
        <EuiFlexItem grow={2}>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.nightshift.topology.sources.label', {
              defaultMessage: 'Sources',
            })}
            helpText={
              selectedSourceIds.length >= MAX_SOURCES_PER_PAGE
                ? i18n.translate('xpack.nightshift.topology.sources.limit', {
                    defaultMessage: 'You can select up to {count} sources.',
                    values: { count: MAX_SOURCES_PER_PAGE },
                  })
                : undefined
            }
          >
            <EuiComboBox
              fullWidth
              compressed
              options={sourceOptions}
              selectedOptions={selectedSourceOptions}
              onChange={updateSources}
              isLoading={sourcesQuery.isLoading}
              placeholder={allSourcesLabel}
              data-test-subj="nightshiftTopologySources"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.topology.viewMode.label', {
              defaultMessage: 'View',
            })}
          >
            <EuiButtonGroup
              isDisabled={!snapshot}
              buttonSize="compressed"
              legend={i18n.translate('xpack.nightshift.topology.viewMode.legend', {
                defaultMessage: 'Topology view',
              })}
              options={[
                {
                  id: 'neighborhood',
                  label: i18n.translate('xpack.nightshift.topology.viewMode.neighborhood', {
                    defaultMessage: 'Neighborhood',
                  }),
                  'data-test-subj': 'nightshiftTopologyViewNeighborhood',
                },
                {
                  id: 'full',
                  label: i18n.translate('xpack.nightshift.topology.viewMode.full', {
                    defaultMessage: 'Full topology',
                  }),
                  'data-test-subj': 'nightshiftTopologyViewFull',
                },
              ]}
              idSelected={viewMode}
              onChange={(id) => {
                setViewMode(id as TopologyViewMode);
                setSelection(undefined);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {!isFullView && (
          <EuiFlexItem grow={false} css={{ width: 96 }}>
            <EuiFormRow
              label={i18n.translate('xpack.nightshift.topology.hops.label', {
                defaultMessage: 'Hops',
              })}
            >
              <EuiFieldNumber
                compressed
                min={1}
                step={1}
                value={hops}
                onChange={(event) => {
                  const next = Math.round(Number(event.target.value));
                  if (Number.isFinite(next)) {
                    setHops(Math.max(next, 1));
                    setSelection(undefined);
                  }
                }}
                data-test-subj="nightshiftTopologyHops"
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {topologyQuery.isError ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('xpack.nightshift.topology.error.title', {
            defaultMessage: 'Unable to load the topology',
          })}
          text={topologyQuery.error.message}
        />
      ) : topologyQuery.isLoading ? (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.nightshift.topology.loading', {
                defaultMessage: 'Building topology',
              })}
            </h2>
          }
        />
      ) : snapshot && snapshot.nodes.length === 0 && snapshot.edges.length === 0 ? (
        <EuiEmptyPrompt
          iconType="graphApp"
          title={
            <h2>
              {i18n.translate('xpack.nightshift.topology.empty.title', {
                defaultMessage: 'No topology entities found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.nightshift.topology.empty.body', {
                defaultMessage:
                  'The selected sources do not contain entity and dependency knowledge indicators.',
              })}
            </p>
          }
        />
      ) : snapshot ? (
        <>
          {snapshot.truncated && (
            <>
              <KbnWarningCallout
                announceOnMount={false}
                title={i18n.translate('xpack.nightshift.topology.truncated.title', {
                  defaultMessage: 'This topology is incomplete',
                })}
                text={i18n.translate('xpack.nightshift.topology.truncated.body', {
                  defaultMessage:
                    'The snapshot reached its feature limit. Some entities or dependencies may be missing.',
                })}
              />
              <EuiSpacer size="m" />
            </>
          )}

          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.topology.summary', {
              defaultMessage:
                '{nodeCount, plural, one {# entity} other {# entities}}, {edgeCount, plural, one {# dependency} other {# dependencies}} · Built {builtAt}',
              values: {
                nodeCount: snapshot.node_count,
                edgeCount: snapshot.edge_count,
                builtAt: new Date(snapshot.built_at).toLocaleString(),
              },
            })}
          </EuiText>
          <EuiSpacer size="s" />

          {showGraph ? (
            <EuiFlexGroup alignItems="stretch" css={{ flex: '1 1 auto' }}>
              <EuiFlexItem grow={3}>
                <TopologyGraph
                  key={isFullView ? 'full' : `${focusedNodeIds.join('\u0000')}:${hops}`}
                  model={model}
                  onSelect={setSelection}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiPanel hasBorder>
                  <SelectionDetails selection={selection} sourceTitles={sourceTitles} />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiEmptyPrompt
              iconType="magnify"
              title={
                <h2>
                  {i18n.translate('xpack.nightshift.topology.focus.title', {
                    defaultMessage: 'Select an entity to explore',
                  })}
                </h2>
              }
              body={
                <p>
                  {i18n.translate('xpack.nightshift.topology.focus.body', {
                    defaultMessage:
                      'Select entities in the Entities list to show their dependencies within the selected number of hops, or switch to the full topology.',
                  })}
                </p>
              }
            />
          )}
        </>
      ) : null}
    </div>
  );
}
