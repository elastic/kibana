/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { inputsModel } from '../../../../../common/store';
import type { HostItem } from '../../../../../../common/search_strategy/security_solution/hosts';
import type { HostEntity } from '../../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { InspectResponse } from '../../../../../types';
import type { HostInfo } from '../../../../../../common/endpoint/types';
import { buildHostFilterFromEntityIdentifiers } from '../../../../../../common/search_strategy/security_solution/risk_score/common';
import { useEntitiesListQuery } from '../../../../../entity_analytics/components/entity_store/hooks/use_entities_list_query';
import { useGetEndpointDetails } from '../../../../../management/hooks';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';

export const ID = 'hostsDetailsQuery';

const ENTITY_STORE_INDEX_PATTERN_V2 = (namespace: string) =>
  `.entities.v2.latest.security_${namespace}`;

export interface HostDetailsArgs {
  id: string;
  inspect: InspectResponse;
  hostDetails: HostItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseHostDetails {
  endDate: string;
  entityIdentifiers: Record<string, string>;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

type HostEntityWithExtendedFields = HostEntity & {
  host?: HostEntity['host'] & {
    os?: { name?: string | string[]; family?: string; platform?: string; version?: string };
  };
  cloud?: {
    provider?: string;
    region?: string;
    instance?: { id?: string };
    machine?: { type?: string };
  };
  agent?: { id?: string; type?: string };
  endpoint?: { id?: string };
};

/**
 * Maps Entity Store HostEntity.host to HostEcs (HostItem.host uses HostEcs with array fields).
 */
const toStrArray = (v: string | string[] | undefined): string[] | undefined =>
  v == null ? undefined : Array.isArray(v) ? v : [v];

const mapEntityHostToHostEcs = (
  host: HostEntityWithExtendedFields['host']
): HostItem['host'] | undefined => {
  if (!host) return undefined;
  const hostData = host as HostEntityWithExtendedFields['host'];
  const os = hostData?.os;
  const osName = os?.name;
  const osVersion = os?.version;
  const osFamily = os?.family;
  const osPlatform = os?.platform;
  return {
    name: [host.name],
    id: toStrArray(host.id),
    ip: host.ip,
    mac: host.mac,
    architecture: host.architecture,
    ...(host.hostname?.length && { hostname: host.hostname }),
    ...(host.domain?.length && { domain: host.domain }),
    ...(host.type?.length && { type: host.type }),
    ...((osName != null || osVersion != null || osFamily != null || osPlatform != null) && {
      os: {
        ...(osName != null && { name: toStrArray(osName) }),
        ...(osVersion != null && { version: toStrArray(osVersion) }),
        ...(osFamily != null && { family: toStrArray(osFamily) }),
        ...(osPlatform != null && { platform: toStrArray(osPlatform) }),
      },
    }),
  };
};

/**
 * Maps Entity Store HostEntity to HostItem for Host Details page.
 */
const mapEntityToHostItem = (
  entity: HostEntityWithExtendedFields,
  endpointHostInfo?: HostInfo
): HostItem => {
  const lastSeen = entity.entity?.lifecycle?.last_activity ?? entity['@timestamp'] ?? '';
  const hostItem: HostItem = {
    host: mapEntityHostToHostEcs(entity.host),
    lastSeen: Array.isArray(lastSeen) ? lastSeen : [lastSeen],
    risk: entity.entity?.risk?.calculated_level,
    criticality: entity.asset?.criticality,
  };

  if (entity.cloud) {
    hostItem.cloud = {
      ...(entity.cloud.provider && { provider: [entity.cloud.provider] }),
      ...(entity.cloud.region && { region: [entity.cloud.region] }),
      ...(entity.cloud.instance?.id && { instance: { id: [entity.cloud.instance.id] } }),
      ...(entity.cloud.machine?.type && { machine: { type: [entity.cloud.machine.type] } }),
    };
  }

  if (entity.agent?.id) {
    hostItem.agent = { id: entity.agent.id };
  }

  if (endpointHostInfo) {
    hostItem.endpoint = {
      hostInfo: endpointHostInfo,
      id: entity.agent?.id ?? entity.endpoint?.id,
    };
  }

  return hostItem;
};

export const useHostDetails = ({
  endDate,
  entityIdentifiers,
  id = ID,
  skip = false,
  startDate,
}: UseHostDetails): [boolean, HostDetailsArgs, inputsModel.Refetch] => {
  const spaceId = useSpaceId();
  const namespace = spaceId ?? 'default';

  const filterQuery = useMemo(() => {
    const filter = buildHostFilterFromEntityIdentifiers(entityIdentifiers);
    return filter ? JSON.stringify(filter) : undefined;
  }, [entityIdentifiers]);

  const { data, isLoading, refetch } = useEntitiesListQuery({
    entityTypes: ['host'],
    page: 1,
    perPage: 1,
    sortField: '@timestamp',
    sortOrder: 'desc',
    filterQuery,
    skip: skip || !filterQuery,
  });

  const entity = useMemo(() => {
    const records = data?.records ?? [];
    const hostEntity = records.find(
      (r: unknown): r is HostEntityWithExtendedFields =>
        r != null && typeof r === 'object' && 'host' in (r as Record<string, unknown>)
    );
    return hostEntity;
  }, [data?.records]);

  const agentId = entity?.agent?.id ?? entity?.endpoint?.id;
  const isEndpoint = entity?.agent?.type === 'endpoint' || !!entity?.endpoint?.id;
  const { data: endpointHostInfo } = useGetEndpointDetails(agentId ?? '', {
    enabled: !!(agentId && isEndpoint),
  });

  const hostDetails = useMemo((): HostItem => {
    if (!entity) {
      return {};
    }
    return mapEntityToHostItem(entity, endpointHostInfo);
  }, [entity, endpointHostInfo]);

  const inspect: InspectResponse = useMemo(
    () =>
      data?.inspect
        ? {
            dsl: data.inspect.dsl ?? [],
            response: data.inspect.response ?? [],
            indexPattern: [ENTITY_STORE_INDEX_PATTERN_V2(namespace)],
          }
        : { dsl: [], response: [], indexPattern: [ENTITY_STORE_INDEX_PATTERN_V2(namespace)] },
    [data?.inspect, namespace]
  );

  const hostDetailsResponse = useMemo(
    () => ({
      endDate,
      hostDetails,
      id,
      inspect,
      isInspected: false,
      refetch: refetch as inputsModel.Refetch,
      startDate,
    }),
    [endDate, hostDetails, id, inspect, refetch, startDate]
  );

  return [isLoading, hostDetailsResponse, refetch as inputsModel.Refetch];
};
