/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TopologyProvenance } from '@kbn/significant-events-schema';
import { useTopologyFeatures } from '../../../data/topology/use_topology_features';

const provenanceLabel = i18n.translate('xpack.nightshift.topology.details.provenance', {
  defaultMessage: 'Provenance',
});
const propertiesLabel = i18n.translate('xpack.nightshift.topology.details.properties', {
  defaultMessage: 'Properties',
});
const propertiesUnavailableLabel = i18n.translate(
  'xpack.nightshift.topology.details.propertiesUnavailable',
  { defaultMessage: 'Properties unavailable' }
);

const formatPropertyValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

/** Description list rows for a topology element's provenance and its KIs' properties. */
export const useProvenanceDetails = (
  provenance: TopologyProvenance[],
  sourceTitles: Map<string, string>
): NonNullable<EuiDescriptionListProps['listItems']> => {
  const { data, isLoading } = useTopologyFeatures(provenance);
  const featuresByUuid = useMemo(
    () => new Map((data?.features ?? []).map((feature) => [feature.uuid, feature])),
    [data]
  );

  if (provenance.length === 0) {
    return [];
  }

  const sourceTitle = (sourceId: string) => sourceTitles.get(sourceId) ?? sourceId;

  const provenanceItem = {
    title: provenanceLabel,
    description: (
      <ul>
        {provenance.map(
          ({ source_id: sourceId, feature_id: featureId, feature_uuid: uuid, confidence }) => (
            <li key={uuid}>
              {i18n.translate('xpack.nightshift.topology.details.provenanceEntry', {
                defaultMessage: '{source}: {featureId} (confidence {confidence})',
                values: { source: sourceTitle(sourceId), featureId, confidence },
              })}
            </li>
          )
        )}
      </ul>
    ),
  };

  if (isLoading) {
    return [
      provenanceItem,
      { title: propertiesLabel, description: <EuiLoadingSpinner size="s" /> },
    ];
  }

  const propertiesItems = provenance.map(({ source_id: sourceId, feature_uuid: uuid }) => {
    const properties = Object.entries(featuresByUuid.get(uuid)?.properties ?? {});
    return {
      title:
        provenance.length > 1
          ? i18n.translate('xpack.nightshift.topology.details.sourceProperties', {
              defaultMessage: 'Properties ({source})',
              values: { source: sourceTitle(sourceId) },
            })
          : propertiesLabel,
      description: !featuresByUuid.has(uuid) ? (
        <EuiText size="s" color="subdued">
          {propertiesUnavailableLabel}
        </EuiText>
      ) : properties.length === 0 ? (
        '—'
      ) : (
        properties.map(([key, value]) => (
          <EuiText size="s" key={key}>
            <strong>{key}</strong>: {formatPropertyValue(value)}
          </EuiText>
        ))
      ),
    };
  });

  return [provenanceItem, ...propertiesItems];
};
