/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';

const asStringArray = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return typeof value === 'string' ? [value] : [];
};

const FILEBEAT_MODULES = [
  'sentinel_one',
  'sentinel_one_cloud_funnel',
  'crowdstrike',
  'jamf_protect',
  'm365_defender',
  'microsoft_defender_endpoint',
];

/**
 * Returns whether analyzer/resolver actions should be enabled for the provided event.
 */
export const useIsAnalyzerEnabled = (hit?: DataTableRecord) =>
  useMemo(() => {
    if (!hit) {
      return false;
    }

    const agentType = getFieldValue(hit, 'agent.type') as string | undefined;
    const eventModule = getFieldValue(hit, 'event.module') as string | undefined;

    const processEntityIds = asStringArray(hit.flattened['process.entity_id']);
    const firstProcessEntityId = processEntityIds[0];

    const eventDataStream = asStringArray(hit.flattened['event.dataset']);
    const datasetIncludesSysmon = eventDataStream.some((datastream) =>
      datastream.includes('windows.sysmon')
    );
    const agentTypeIsEndpoint = agentType === 'endpoint';
    const agentTypeIsWinlogBeat = agentType === 'winlogbeat' && eventModule === 'sysmon';
    const agentTypeIsFilebeat =
      agentType === 'filebeat' && eventModule != null && FILEBEAT_MODULES.includes(eventModule);
    const isAcceptedAgentType =
      agentTypeIsEndpoint || agentTypeIsWinlogBeat || datasetIncludesSysmon || agentTypeIsFilebeat;
    const hasProcessEntityId =
      processEntityIds != null && processEntityIds.length === 1 && firstProcessEntityId !== '';

    return isAcceptedAgentType && hasProcessEntityId;
  }, [hit]);
