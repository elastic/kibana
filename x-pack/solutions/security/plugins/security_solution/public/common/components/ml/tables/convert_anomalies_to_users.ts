/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anomalies, AnomaliesByUser, Anomaly, EntityIdentifiers } from '../types';
import { getUserNameFromInfluencers } from '../influencers/get_user_name_from_influencers';
import type { EntityIdentifiers as QueryTabEntityIdentifiers } from '../../../containers/anomalies/anomalies_query_tab_body/types';

export const convertAnomaliesToUsers = (
  anomalies: Anomalies | null,
  jobNameById: Record<string, string | undefined>,
  entityIdentifiers?: QueryTabEntityIdentifiers
): AnomaliesByUser[] => {
  if (anomalies == null) {
    return [];
  } else {
    const userName = entityIdentifiers?.['user.name'];
    return anomalies.anomalies.reduce<AnomaliesByUser[]>((accum, item) => {
      if (getUserNameFromEntity(item, userName)) {
        const userEntityIdentifiers: EntityIdentifiers = {
          'user.name': item.entityValue,
        };
        return [
          ...accum,
          {
            entityIdentifiers: userEntityIdentifiers,
            jobName: jobNameById[item.jobId] ?? item.jobId,
            anomaly: item,
          },
        ];
      } else {
        const userNameFromInfluencers = getUserNameFromInfluencers(item.influencers, userName);
        if (userNameFromInfluencers != null) {
          const userEntityIdentifiers: EntityIdentifiers = {
            'user.name': userNameFromInfluencers,
          };
          return [
            ...accum,
            {
              entityIdentifiers: userEntityIdentifiers,
              jobName: jobNameById[item.jobId] ?? item.jobId,
              anomaly: item,
            },
          ];
        } else {
          return accum;
        }
      }
    }, []);
  }
};

export const getUserNameFromEntity = (anomaly: Anomaly, userName?: string): boolean => {
  if (anomaly.entityName !== 'user.name') {
    return false;
  } else if (userName == null) {
    return true;
  } else {
    return anomaly.entityValue === userName;
  }
};
