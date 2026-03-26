/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import moment from 'moment';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import { generateDataProvider } from '../modules/timeline/utils/data_provider';
import {
  fieldAndValueValid,
  getIndicatorFieldAndValue,
} from '../modules/indicators/utils/field_value';
import { unwrapValue } from '../modules/indicators/utils/unwrap_value';
import {
  type Indicator,
  IndicatorFieldEventEnrichmentMap,
  RawIndicatorFieldId,
} from '../../../common/threat_intelligence/types/indicator';
import { timelineDefaults } from '../../timelines/store/defaults';
import { APP_UI_ID } from '../../../common/constants';
import { TimelineId } from '../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../common/api/timeline';
import { useStartTransaction } from '../../common/lib/apm/use_start_transaction';
import { useCreateTimeline } from '../../timelines/hooks/use_create_timeline';
import type { CreateTimelineProps } from '../../detections/components/alerts_table/types';
import { useUpdateTimeline } from '../../timelines/components/open_timeline/use_update_timeline';

interface UseInvestigateInTimelineActionProps {
  /**
   * Created when the user clicks on the Investigate in Timeline button.
   * DataProvider contain the field(s) and value(s) displayed in the timeline.
   */
  dataProviders: DataProvider[];
  /**
   * Start date used in the createTimeline method.
   */
  from: string;
  /**
   * End date used in the createTimeline method.
   */
  to: string;
}

/**
 * This code is closely duplicated from here: https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/use_investigate_in_timeline.tsx,
 * the main changes being:
 * - no exceptions are handled at the moment
 * - we use dataProviders, from and to directly instead of consuming ecsData
 */
const useInvestigateInTimelineInternal = ({
  dataProviders,
  from,
  to,
}: UseInvestigateInTimelineActionProps) => {
  const { startTransaction } = useStartTransaction();

  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineTypeEnum.default,
  });

  const updateTimeline = useUpdateTimeline();

  const createTimeline = useCallback(
    async ({ from: fromTimeline, timeline, to: toTimeline, ruleNote }: CreateTimelineProps) => {
      await clearActiveTimeline();
      updateTimeline({
        duplicate: true,
        from: fromTimeline,
        id: TimelineId.active,
        notes: [],
        timeline: {
          ...timeline,
          indexNames: timeline.indexNames ?? [],
          show: true,
        },
        to: toTimeline,
        ruleNote,
      });
    },
    [updateTimeline, clearActiveTimeline]
  );

  const investigateInTimelineClick = useCallback(async () => {
    startTransaction({ name: `${APP_UI_ID} threat indicator investigateInTimeline` });
    createTimeline({
      from,
      notes: null,
      timeline: {
        ...timelineDefaults,
        dataProviders,
        id: TimelineId.active,
        indexNames: [],
        dateRange: {
          start: from,
          end: to,
        },
        eventType: 'all',
        filters: [],
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression: '',
            },
            serializedQuery: '',
          },
        },
      },
      to,
      ruleNote: '',
    });
  }, [startTransaction, createTimeline, dataProviders, from, to]);

  return investigateInTimelineClick;
};

export interface UseInvestigateInTimelineParam {
  /**
   * Indicator used to retrieve the field and value then passed to the Investigate in Timeline logic
   */
  indicator: Indicator;
}

export interface UseInvestigateInTimelineValue {
  /**
   * Investigate in Timeline function to run on click event.
   */
  investigateInTimelineFn: () => Promise<void> | undefined;
}

/**
 * Custom hook that gets an {@link Indicator}, retrieves the field (from the RawIndicatorFieldId.Name)
 * and value, then creates DataProviders used to do the Investigate in Timeline logic
 * (see /kibana/x-pack/solutions/security/plugins/security_solution/public/threat_intelligence/use_investigate_in_timeline.ts)
 */
export const useInvestigateInTimeline = ({
  indicator,
}: UseInvestigateInTimelineParam): UseInvestigateInTimelineValue => {
  const { key, value } = getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.Name);
  const sourceEventField = IndicatorFieldEventEnrichmentMap[key] ?? [];

  const dataProviders: DataProvider[] = [...sourceEventField, key].map((e: string) =>
    generateDataProvider(e, value as string)
  );

  const indicatorTimestamp: string = unwrapValue(
    indicator,
    RawIndicatorFieldId.TimeStamp
  ) as string;

  const from = moment(indicatorTimestamp).subtract(7, 'd').toISOString();
  const to = moment(indicatorTimestamp).add(7, 'd').toISOString();

  const investigateInTimelineFn = useInvestigateInTimelineInternal({
    dataProviders,
    from,
    to,
  });

  if (!to || !from) {
    return {} as unknown as UseInvestigateInTimelineValue;
  }

  if (!fieldAndValueValid(key, value) || !sourceEventField) {
    return {} as unknown as UseInvestigateInTimelineValue;
  }

  return { investigateInTimelineFn };
};
