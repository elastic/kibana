/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';

import type { Anomalies, AnomaliesByHost, Anomaly } from '../types';
import {
  anomalyEntityNameInEuidIdentitySourceFields,
  anomalyMatchesMlEntityField,
  anomalyRowMatchesIdentityIdentifiers,
  buildEuidSampleDocumentForAnomaliesTable,
  pickAnomalyRowLabelMatchingIdentifiers,
} from '../anomaly/anomaly_table_euid';
import { getHostNameFromInfluencers } from '../influencers/get_host_name_from_influencers';

export const convertAnomaliesToHosts = (
  anomalies: Anomalies | null,
  jobNameById: Record<string, string | undefined>,
  hostName?: string,
  identityFields?: Record<string, string>,
  euid?: EntityStoreEuid
): AnomaliesByHost[] => {
  if (anomalies == null) {
    return [];
  }
  const isScoped = hostName != null;
  const doc = buildEuidSampleDocumentForAnomaliesTable('host', identityFields, hostName);
  const identifiers =
    euid && isScoped ? euid.getEntityIdentifiersFromDocument('host', doc) : undefined;
  const identifiersUsable = identifiers != null && Object.keys(identifiers).length > 0;
  const identitySourceFields = euid?.getEuidSourceFields('host').identitySourceFields ?? [];

  return anomalies.anomalies.reduce<AnomaliesByHost[]>((accum, item) => {
    let matched = false;
    let label: string | null = null;

    if (isScoped) {
      if (identifiersUsable && identifiers) {
        if (anomalyRowMatchesIdentityIdentifiers(item, identifiers)) {
          matched = true;
          label = pickAnomalyRowLabelMatchingIdentifiers(item, identifiers);
        }
      } else if (anomalyMatchesMlEntityField(item, 'host.name', hostName)) {
        matched = true;
        label = String(item.entityValue);
      } else {
        const fromInfl = getHostNameFromInfluencers(item.influencers, hostName, 'host.name');
        if (fromInfl != null) {
          matched = true;
          label = fromInfl;
        }
      }
    } else if (euid) {
      if (anomalyEntityNameInEuidIdentitySourceFields(item, euid, 'host')) {
        matched = true;
        label = String(item.entityValue);
      } else {
        for (const field of identitySourceFields) {
          const fromInfl = getHostNameFromInfluencers(item.influencers, undefined, field);
          if (fromInfl != null) {
            matched = true;
            label = fromInfl;
            break;
          }
        }
      }
    } else if (anomalyMatchesMlEntityField(item, 'host.name', undefined)) {
      matched = true;
      label = String(item.entityValue);
    } else {
      const fromInfl = getHostNameFromInfluencers(item.influencers, undefined, 'host.name');
      if (fromInfl != null) {
        matched = true;
        label = fromInfl;
      }
    }

    if (!matched || label == null) {
      return accum;
    }

    return [
      ...accum,
      {
        hostName: label,
        jobName: jobNameById[item.jobId] ?? item.jobId,
        anomaly: item,
      },
    ];
  }, []);
};

export const getHostNameFromEntity = (anomaly: Anomaly, hostName?: string): boolean =>
  anomalyMatchesMlEntityField(anomaly, 'host.name', hostName);
