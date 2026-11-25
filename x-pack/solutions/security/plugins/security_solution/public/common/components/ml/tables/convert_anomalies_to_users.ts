/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuidApi } from '@kbn/entity-store/public';

import type { Anomalies, AnomaliesByUser, Anomaly } from '../types';
import {
  anomalyEntityNameInEuidIdentitySourceFields,
  anomalyMatchesMlEntityField,
  anomalyRowMatchesIdentityIdentifiers,
  buildEuidSampleDocumentForAnomaliesTable,
  pickAnomalyRowLabelMatchingIdentifiers,
} from '../anomaly/anomaly_table_euid';
import { getUserNameFromInfluencers } from '../influencers/get_user_name_from_influencers';

export const convertAnomaliesToUsers = (
  anomalies: Anomalies | null,
  jobNameById: Record<string, string | undefined>,
  userName?: string,
  identityFields?: Record<string, string>,
  euidApi?: EntityStoreEuidApi
): AnomaliesByUser[] => {
  if (anomalies == null) {
    return [];
  }
  const isScoped = userName != null;
  const doc = buildEuidSampleDocumentForAnomaliesTable('user', identityFields, userName);
  const identifiers =
    euidApi && isScoped
      ? euidApi.euid.getEntityIdentifiersFromDocument(
          euidApi.getBuiltInEntityDefinition('user'),
          doc
        )
      : undefined;
  const identifiersUsable = identifiers != null && Object.keys(identifiers).length > 0;
  const identitySourceFields =
    euidApi?.euid.getEuidSourceFields(euidApi.getBuiltInEntityDefinition('user'))
      .identitySourceFields ?? [];

  return anomalies.anomalies.reduce<AnomaliesByUser[]>((accum, item) => {
    let matched = false;
    let label: string | null = null;

    if (isScoped) {
      if (identifiersUsable && identifiers) {
        if (anomalyRowMatchesIdentityIdentifiers(item, identifiers)) {
          matched = true;
          label = pickAnomalyRowLabelMatchingIdentifiers(item, identifiers);
        }
      } else if (anomalyMatchesMlEntityField(item, 'user.name', userName)) {
        matched = true;
        label = String(item.entityValue);
      } else {
        const fromInfl = getUserNameFromInfluencers(item.influencers, userName, 'user.name');
        if (fromInfl != null) {
          matched = true;
          label = fromInfl;
        }
      }
    } else if (euidApi) {
      if (anomalyEntityNameInEuidIdentitySourceFields(item, euidApi, 'user')) {
        matched = true;
        label = String(item.entityValue);
      } else {
        for (const field of identitySourceFields) {
          const fromInfl = getUserNameFromInfluencers(item.influencers, undefined, field);
          if (fromInfl != null) {
            matched = true;
            label = fromInfl;
            break;
          }
        }
      }
    } else if (anomalyMatchesMlEntityField(item, 'user.name', undefined)) {
      matched = true;
      label = String(item.entityValue);
    } else {
      const fromInfl = getUserNameFromInfluencers(item.influencers, undefined, 'user.name');
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
        userName: label,
        jobName: jobNameById[item.jobId] ?? item.jobId,
        anomaly: item,
      },
    ];
  }, []);
};

export const getUserNameFromEntity = (anomaly: Anomaly, userName?: string): boolean =>
  anomalyMatchesMlEntityField(anomaly, 'user.name', userName);
