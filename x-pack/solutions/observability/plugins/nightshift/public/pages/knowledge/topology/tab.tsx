/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption, EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
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
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { MAX_SOURCES_PER_PAGE } from '@kbn/nightshift-shared';
import type { TopologyProvenance } from '@kbn/significant-events-schema';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { useFetchSources } from '../../../data/sources/use_fetch_sources';
import { useTopologySnapshot } from '../../../data/topology/use_topology_snapshot';
import { useProvenanceDetails } from './provenance_details';
import { TopologyGraph, type TopologyGraphSelection } from './topology_graph';
import {
  buildFullTopology,
  buildTopologyNeighborhood,
  getTopologyNodeLabel,
} from './topology_model';

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

interface EntityOptionValue {
  nodeId: string;
  displayLabel: string;
}

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

export function TopologyTab(): React.ReactElement {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [focusedNodeId, setFocusedNodeId] = useState<string>();
  const [viewMode, setViewMode] = useState<TopologyViewMode>('neighborhood');
  const [hops, setHops] = useState(1);
  const [selection, setSelection] = useState<TopologyGraphSelection>();
  const sourcesQuery = useFetchSources();
  const topologyQuery = useTopologySnapshot(selectedSourceIds);
  const snapshot = topologyQuery.data;

  const sourceOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      (sourcesQuery.data ?? []).map(({ id, title }) => ({
        label: title,
        value: id,
        disabled:
          selectedSourceIds.length >= MAX_SOURCES_PER_PAGE && !selectedSourceIds.includes(id),
      })),
    [selectedSourceIds, sourcesQuery.data]
  );
  const selectedSourceOptions = sourceOptions.filter(({ value }) =>
    value ? selectedSourceIds.includes(value) : false
  );
  const sourceTitles = useMemo(
    () => new Map((sourcesQuery.data ?? []).map(({ id, title }) => [id, title])),
    [sourcesQuery.data]
  );

  const entityOptions = useMemo(
    () =>
      (snapshot?.nodes ?? []).map((node): EuiComboBoxOptionOption<EntityOptionValue> => {
        const displayLabel = getTopologyNodeLabel(node);
        return {
          label: [...new Set([displayLabel, node.node_id, node.name, node.technology])].join(' '),
          value: { nodeId: node.node_id, displayLabel },
        };
      }),
    [snapshot?.nodes]
  );
  const selectedEntityOptions = entityOptions.flatMap(({ value }) =>
    value?.nodeId === focusedNodeId ? [{ label: value.displayLabel, value }] : []
  );
  const isFullView = viewMode === 'full';
  const showGraph = isFullView || focusedNodeId !== undefined;
  const model = useMemo(() => {
    if (!snapshot) {
      return { nodes: [], edges: [] };
    }
    if (isFullView) {
      return buildFullTopology(snapshot);
    }
    return focusedNodeId
      ? buildTopologyNeighborhood(snapshot, focusedNodeId, hops)
      : { nodes: [], edges: [] };
  }, [focusedNodeId, hops, isFullView, snapshot]);

  const updateSources = (options: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedSourceIds(options.flatMap(({ value }) => (value ? [value] : [])));
    setFocusedNodeId(undefined);
    setSelection(undefined);
  };

  return (
    <>
      <EuiFlexGroup alignItems="flexEnd" wrap>
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
        <EuiFlexItem grow={3}>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.nightshift.topology.entity.label', {
              defaultMessage: 'Focus entity',
            })}
          >
            <EuiComboBox
              fullWidth
              compressed
              singleSelection={{ asPlainText: true }}
              options={entityOptions}
              selectedOptions={selectedEntityOptions}
              onChange={(options) => {
                setFocusedNodeId(options[0]?.value?.nodeId);
                setSelection(undefined);
              }}
              renderOption={(option) => option.value?.displayLabel ?? option.label}
              isLoading={topologyQuery.isLoading}
              isDisabled={isFullView || !snapshot || snapshot.nodes.length === 0}
              placeholder={i18n.translate('xpack.nightshift.topology.entity.placeholder', {
                defaultMessage: 'Search entities by name, ID, or technology',
              })}
              data-test-subj="nightshiftTopologyEntitySearch"
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
        {focusedNodeId && !isFullView && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="nightshiftTopologyClearFocus"
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.CLEAR_TOPOLOGY_FOCUS,
                element: NIGHTSHIFT_EBT_ELEMENTS.TOPOLOGY,
              })}
              onClick={() => {
                setFocusedNodeId(undefined);
                setSelection(undefined);
              }}
            >
              {i18n.translate('xpack.nightshift.topology.clearFocus', {
                defaultMessage: 'Clear focus',
              })}
            </EuiButtonEmpty>
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
      ) : snapshot?.nodes.length === 0 ? (
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
            <EuiFlexGroup alignItems="stretch">
              <EuiFlexItem grow={3}>
                <TopologyGraph
                  key={isFullView ? 'full' : `${focusedNodeId}:${hops}`}
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
                    defaultMessage: 'Choose an entity to explore',
                  })}
                </h2>
              }
              body={
                <p>
                  {i18n.translate('xpack.nightshift.topology.focus.body', {
                    defaultMessage:
                      'Search for an entity to show its dependencies within the selected number of hops, or switch to the full topology.',
                  })}
                </p>
              }
            />
          )}
        </>
      ) : null}
    </>
  );
}
