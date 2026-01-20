/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anomalies, AnomaliesByHost, Anomaly, EntityIdentifiers } from '../types';
import { getHostNameFromInfluencers } from '../influencers/get_host_name_from_influencers';
import type { EntityIdentifiers as QueryTabEntityIdentifiers } from '../../../containers/anomalies/anomalies_query_tab_body/types';

export const convertAnomaliesToHosts = (
  anomalies: Anomalies | null,
  jobNameById: Record<string, string | undefined>,
  entityIdentifiers?: QueryTabEntityIdentifiers
): AnomaliesByHost[] => {
  if (anomalies == null) {
    return [];
  } else {
    const hostName = entityIdentifiers?.['host.name'] || entityIdentifiers?.['host.hostname'];
    return anomalies.anomalies.reduce<AnomaliesByHost[]>((accum, item) => {
      if (getHostNameFromEntity(item, hostName)) {
        const hostEntityIdentifiers: EntityIdentifiers = {
          'host.name': item.entityValue,
        };
        return [
          ...accum,
          {
            entityIdentifiers: hostEntityIdentifiers,
            jobName: jobNameById[item.jobId] ?? item.jobId,
            anomaly: item,
          },
        ];
      } else {
        const hostNameFromInfluencers = getHostNameFromInfluencers(item.influencers, hostName);
        if (hostNameFromInfluencers != null) {
          const hostEntityIdentifiers: EntityIdentifiers = {
            'host.name': hostNameFromInfluencers,
          };
          return [
            ...accum,
            {
              entityIdentifiers: hostEntityIdentifiers,
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

export const getHostNameFromEntity = (anomaly: Anomaly, hostName?: string): boolean => {
  if (anomaly.entityName !== 'host.name') {
    return false;
  } else if (hostName == null) {
    return true;
  } else {
    return anomaly.entityValue === hostName;
  }
};
