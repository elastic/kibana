/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { estypes } from '@elastic/elasticsearch';
import { useKibana } from '../utils/kibana_react';
import type { ImpactedService } from '../components/sigevents_overview/main_significant_event';
import type { ImpactedCardItem } from '../components/sigevents_overview/sigevents_overview';
import type { SignificantEventDetailFields } from '../components/sigevents_overview/significant_event_detail_body';

const SIGEVENTS_INDEX = 'sigevents-events-ms';

interface BlastRadiusItem {
  ki_id: string;
  name: string;
  stream_name: string;
  confirmed: boolean;
}

interface CauseKiItem {
  ki_id: string;
  name: string;
  stream_name: string;
  confirmed: boolean;
}

interface SignificantEventDocument {
  '@timestamp': string;
  event_id: string;
  discovery_id: string;
  discovery_slug: string;
  verdict: 'promoted' | 'acknowledged' | 'demoted';
  title: string;
  summary: string;
  root_cause: string;
  rule_names: string[];
  stream_names: string[];
  blast_radius: BlastRadiusItem[];
  cause_kis: CauseKiItem[];
  criticality: number;
  recommended_action: 'escalate' | 'monitor' | 'resolve';
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
  verdict_id: string;
  last_reviewed_at: string;
}

export interface LatestSignificantEventData {
  raw: SignificantEventDocument;
  state: 'critical' | 'warning' | 'healthy';
  blastRadiusScore: number;
  mainEventTitle: string;
  description: string;
  impactedServices: ImpactedService[];
  impactedCards: ImpactedCardItem[];
  severityLabel: string;
  severityColor: 'danger' | 'warning' | 'primary' | 'subdued';
  detailFields: SignificantEventDetailFields;
  timestamp: string;
}

function mapImpactToSeverity(impact: SignificantEventDocument['impact']): {
  label: string;
  color: 'danger' | 'warning' | 'primary' | 'subdued';
  state: 'critical' | 'warning' | 'healthy';
} {
  switch (impact) {
    case 'critical':
      return { label: 'Critical', color: 'danger', state: 'critical' };
    case 'high':
      return { label: 'High', color: 'warning', state: 'warning' };
    case 'medium':
      return { label: 'Medium', color: 'primary', state: 'warning' };
    case 'low':
      return { label: 'Low', color: 'subdued', state: 'healthy' };
    default:
      return { label: 'Unknown', color: 'subdued', state: 'healthy' };
  }
}

function mapDocumentToData(doc: SignificantEventDocument): LatestSignificantEventData {
  const severity = mapImpactToSeverity(doc.impact);

  const confirmedServices = (doc.blast_radius ?? [])
    .filter((item) => item.confirmed)
    .map((item) => ({
      id: item.ki_id,
      label: item.name,
      iconType: 'package' as const,
    }));

  const impactedCards: ImpactedCardItem[] = [
    ...(doc.cause_kis ?? [])
      .filter((item) => item.confirmed)
      .map((item) => ({
        id: `cause-${item.ki_id}`,
        label: 'Root Cause',
        value: item.name,
        iconType: 'warning' as const,
      })),
    ...confirmedServices.slice(0, 2).map((service) => ({
      id: `service-${service.id}`,
      label: 'Service',
      value: service.label,
      iconType: 'package' as const,
    })),
  ];

  const detailFields: SignificantEventDetailFields = {
    id: doc.event_id,
    label: doc.title,
    subtitle: (doc.stream_names ?? []).join(' · '),
    severityLabel: severity.label,
    severityColor: severity.color,
  };

  return {
    raw: doc,
    state: severity.state,
    blastRadiusScore: doc.criticality ?? 0,
    mainEventTitle: doc.title ?? '',
    description: doc.summary || (doc.recommendations ?? [])[0] || '',
    impactedServices: confirmedServices,
    impactedCards,
    severityLabel: severity.label,
    severityColor: severity.color,
    detailFields,
    timestamp: doc['@timestamp'],
  };
}

export function useFetchLatestSignificantEvent(): {
  loading: boolean;
  error: Error | null;
  data: LatestSignificantEventData | null;
  otherPromotedEvents: LatestSignificantEventData[];
  refetch: () => void;
} {
  const { services } = useKibana();
  const { data: dataService } = services;

  const searchParams = useMemo(
    (): estypes.SearchRequest => ({
      index: SIGEVENTS_INDEX,
      query: {
        term: { verdict: 'promoted' },
      },
      sort: [{ '@timestamp': { order: 'desc' as const } }],
      size: 100,
    }),
    []
  );

  const {
    data: result,
    error,
    isLoading,
    refetch,
  } = useQuery<estypes.SearchResponse<SignificantEventDocument>, Error>(
    ['latestSignificantEvent'],
    async ({ signal }) => {
      const response = await lastValueFrom(
        dataService.search.search<
          { params: estypes.SearchRequest },
          { rawResponse: estypes.SearchResponse<SignificantEventDocument> }
        >({ params: searchParams }, { abortSignal: signal })
      );
      return response.rawResponse;
    },
    {
      enabled: !!dataService?.search?.search,
      keepPreviousData: true,
      retry: 1,
    }
  );

  const { primaryEvent, otherEvents } = useMemo(() => {
    if (!result?.hits?.hits?.length) {
      return { primaryEvent: null, otherEvents: [] };
    }

    const docs = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is SignificantEventDocument => doc !== undefined);

    // Primary event: most recent promoted event with high impact
    const highImpactIndex = docs.findIndex((doc) => doc.impact === 'high');
    const primaryDoc = highImpactIndex >= 0 ? docs[highImpactIndex] : docs[0];
    const others = docs.filter((doc) => doc !== primaryDoc);

    return {
      primaryEvent: primaryDoc ? mapDocumentToData(primaryDoc) : null,
      otherEvents: others.map(mapDocumentToData),
    };
  }, [result]);

  return {
    loading: isLoading,
    error: error ?? null,
    data: primaryEvent,
    otherPromotedEvents: otherEvents,
    refetch,
  };
}
