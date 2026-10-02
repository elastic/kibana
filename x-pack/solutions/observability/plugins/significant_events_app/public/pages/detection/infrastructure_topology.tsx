/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import {
  INVENTORY_LOCATOR_ID,
  type InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import type { DetectionModel, DetectionEntity } from './model';
import { DetectionTopology } from './topology';

const dimensions: Array<{ kind: string; fields: string[] }> = [
  { kind: 'host', fields: ['host.name', 'host_name', 'resource.attributes.host.name'] },
  {
    kind: 'cluster',
    fields: [
      'kubernetes.cluster.name',
      'k8s.cluster.name',
      'cluster_name',
      'resource.attributes.k8s.cluster.name',
    ],
  },
  {
    kind: 'container',
    fields: [
      'container.name',
      'container_name',
      'attributes.container_name',
      'resource.attributes.container.name',
    ],
  },
  {
    kind: 'pod',
    fields: ['kubernetes.pod.name', 'k8s.pod.name', 'pod_name', 'resource.attributes.k8s.pod.name'],
  },
];

export const InfrastructureTopology = ({
  model,
  features,
  onSelectService,
  onInspectFeature,
}: {
  model: DetectionModel;
  features: Feature[];
  onSelectService: (id: string) => void;
  onInspectFeature: (feature: Feature) => void;
}): React.ReactElement => {
  const { dependencies } = useKibana();
  const locator =
    dependencies.start.share.url.locators.get<InventoryLocatorParams>(INVENTORY_LOCATOR_ID);
  const [selectedId, setSelectedId] = useState<string>();
  const infrastructure = useMemo<DetectionModel>(() => {
    const nodes = new Map<string, DetectionEntity>();
    const relationships: DetectionModel['relationships'] = [];
    const record = (kind: string, name: string, feature: Feature): void => {
      const environment =
        typeof feature.properties.environment === 'string' ? feature.properties.environment : '';
      const id = `infrastructure:${JSON.stringify([kind, environment, name])}`;
      const node: DetectionEntity = nodes.get(id) ?? {
        id,
        name,
        label: name,
        subtype: kind,
        namespace: '',
        environment,
        features: [],
        streams: [],
        queries: [],
        detections: [],
        events: [],
      };
      if (!node.features.includes(feature)) node.features.push(feature);
      if (!node.streams.includes(feature.stream_name)) node.streams.push(feature.stream_name);
      nodes.set(id, node);
      for (const service of model.entities.filter((entity) =>
        entity.streams.includes(feature.stream_name)
      )) {
        const edgeId = `${service.id}:${id}`;
        const edge = relationships.find((item) => item.id === edgeId);
        if (edge) {
          if (!edge.features.includes(feature)) edge.features.push(feature);
        } else
          relationships.push({ id: edgeId, source: service.id, target: id, features: [feature] });
      }
    };
    for (const feature of features.filter(
      (item) => !item.excluded && (!item.expires_at || Date.parse(item.expires_at) > Date.now())
    )) {
      for (const dimension of dimensions)
        for (const field of dimension.fields) {
          const direct = feature.properties[field];
          if (typeof direct === 'string' && direct.trim()) record(dimension.kind, direct, feature);
        }
      if (feature.type !== 'dataset_analysis') continue;
      const analysis = feature.properties.analysis;
      if (
        !analysis ||
        typeof analysis !== 'object' ||
        Array.isArray(analysis) ||
        !('fields' in analysis)
      )
        continue;
      const fields = analysis.fields;
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) continue;
      for (const [field, values] of Object.entries(fields)) {
        const dimension = dimensions.find((item) =>
          item.fields.includes(field.replace(/ \(.*\)$/, ''))
        );
        if (!dimension || !Array.isArray(values)) continue;
        for (const value of values) {
          if (typeof value !== 'string' || value.startsWith('...')) continue;
          const name = value.replace(/ \([\d.]+%\)$/, '').trim();
          if (name && name !== 'null') record(dimension.kind, name, feature);
        }
      }
    }
    const linkedServices = new Set(relationships.map((edge) => edge.source));
    return {
      entities: [
        ...model.entities.filter((entity) => linkedServices.has(entity.id)),
        ...nodes.values(),
      ],
      relationships,
      unresolvedRelationships: 0,
      unassignedRules: 0,
    };
  }, [features, model]);
  const selectedNode = infrastructure.entities.find((entity) => entity.id === selectedId);
  const inventoryHref =
    selectedNode?.id.startsWith('infrastructure:') && locator
      ? locator.getRedirectUrl({
          nodeType:
            selectedNode.subtype === 'container'
              ? 'docker'
              : selectedNode.subtype === 'pod'
              ? 'pod'
              : 'host',
          metric: '(type:cpu)',
          waffleFilter: {
            kind: 'kuery',
            expression: `${
              selectedNode.subtype === 'container'
                ? 'container.name'
                : selectedNode.subtype === 'pod'
                ? 'kubernetes.pod.name'
                : selectedNode.subtype === 'cluster'
                ? 'orchestrator.cluster.name'
                : 'host.name'
            }: ${JSON.stringify(selectedNode.name)}`,
          },
        })
      : undefined;
  return (
    <>
      {inventoryHref && (
        <>
          <EuiButtonEmpty
            data-test-subj="significantEventsAppInfrastructureTopologyOpenSelectedInfrastructureInInventoryButton"
            size="xs"
            iconType="productCloudInfra"
            href={inventoryHref}
          >
            {i18n.translate('xpack.significantEventsApp.infrastructure.open', {
              defaultMessage: 'Open selected infrastructure in Inventory',
            })}
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
        </>
      )}
      <DetectionTopology
        model={infrastructure}
        description={i18n.translate('xpack.significantEventsApp.infrastructure.mapDescription', {
          defaultMessage:
            'Services and infrastructure observed together. Select a connection for its source knowledge.',
        })}
        selectedId={selectedId}
        title={i18n.translate('xpack.significantEventsApp.infrastructure.title', {
          defaultMessage: 'Infrastructure observations',
        })}
        onSelect={(id) => {
          setSelectedId(id);
          const node = infrastructure.entities.find((entity) => entity.id === id);
          if (id.startsWith('infrastructure:') && node?.features[0])
            onInspectFeature(node.features[0]);
          else onSelectService(id);
        }}
        onInspectFeature={onInspectFeature}
      />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.significantEventsApp.infrastructure.evidence', {
            defaultMessage:
              'Links connect services to hosts, clusters, pods and containers observed in their stream’s knowledge. These are sampled observations, not a live inventory. Select a link to inspect its evidence.',
          })}
        </p>
        {infrastructure.entities.length === 0 && (
          <p>
            {i18n.translate('xpack.significantEventsApp.infrastructure.empty', {
              defaultMessage:
                'No infrastructure identities have been learned yet. Refresh knowledge for a stream that includes host, cluster or container fields.',
            })}
          </p>
        )}
      </EuiText>
    </>
  );
};
