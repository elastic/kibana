/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type {
  Detection,
  Feature,
  QueryWithOccurrences,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import { useDetectionData } from '../../pages/detection/use_detection_data';

export interface EvidenceData {
  features: Feature[];
  queries: QueryWithOccurrences[];
  detections: Detection[];
  events: SignificantEventResponse[];
}
export interface EvidenceTarget {
  kind: 'source' | 'service' | 'feature' | 'rule' | 'detection' | 'event';
  id: string;
  stream?: string;
  ruleId?: string;
}
export const EvidenceContext = createContext<
  | {
      data: EvidenceData;
      onNavigate: (target: EvidenceTarget) => void;
    }
  | undefined
>(undefined);

export const evidenceSearch = (search: string, target: EvidenceTarget): URLSearchParams => {
  const next = new URLSearchParams(search);
  for (const key of [
    'knowledgeId',
    'ruleId',
    'detectionId',
    'detectionRule',
    'eventId',
    'drawer',
    'stream',
  ])
    next.delete(key);
  if (target.stream) next.set('stream', target.stream);
  if (target.kind === 'source') next.set('stream', target.stream || target.id);
  if (target.kind === 'source' && !next.get('stream')) next.delete('stream');
  if (target.kind === 'service') {
    next.delete('deployment');
    next.delete('overviewFilter');
    next.delete('coverage');
    next.delete('entity');
    next.append('entity', target.id);
    next.set('view', next.get('poc') === 'true' ? 'events' : 'overview');
  }
  if (target.kind === 'feature') next.set('knowledgeId', target.id);
  if (target.kind === 'rule') {
    next.set('ruleId', target.id);
    next.set('view', 'rules');
  }
  if (target.kind === 'detection') {
    next.set('detectionId', target.id);
    next.set('view', 'events');
    if (target.ruleId) next.set('detectionRule', target.ruleId);
  }
  if (target.kind === 'event') {
    next.set('eventId', target.id);
    next.set('view', 'events');
  }
  return next;
};

export const evidencePath = (target: EvidenceTarget): string =>
  target.kind === 'source' ? '/detection/sources' : '/detection';

export const useEvidence = () => {
  const context = useContext(EvidenceContext);
  const location = useLocation();
  const { core } = useKibana();
  const params = new URLSearchParams(location.search);
  const query = useDetectionData(
    params.get('rangeFrom') || 'now-7d',
    params.get('rangeTo') || 'now',
    !context
  );
  const data = context?.data ?? {
    features: query.data?.features.features ?? [],
    queries: query.data?.queries.queries ?? [],
    detections: query.data?.detections.hits ?? [],
    events: query.data?.events.hits ?? [],
  };
  const href = (target: EvidenceTarget): string => {
    const next = evidenceSearch(location.search, target);
    return core.application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
      path: `${evidencePath(target)}?${next}`,
    });
  };
  return {
    data,
    href,
    onNavigate: context?.onNavigate,
    loading: !context && query.isLoading,
    error: !context && query.isError,
    retry: query.refetch,
  };
};
