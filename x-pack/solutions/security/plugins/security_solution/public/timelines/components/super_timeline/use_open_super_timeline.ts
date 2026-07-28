/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { resolveTimeline } from '../../containers/api';
import { formatTimelineResponseToModel } from '../open_timeline/helpers';
import { useUpdateTimeline } from '../open_timeline/use_update_timeline';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';
import { PageScope } from '../../../data_view_manager/constants';
import { useKibana } from '../../../common/lib/kibana';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { TimelineStatusEnum } from '../../../../common/api/timeline';
import { selectTimelineById } from '../../store/selectors';
import type { State } from '../../../common/store';
import type { TimelineModel } from '../../store/model';
import { buildSuperTimelineModel } from './build_super_timeline_model';

export const MAX_SUPER_TIMELINE_COUNT = 10;
const MIN_SUPER_TIMELINE_COUNT = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

const isTimelineDirty = (timeline: TimelineModel | null): boolean =>
  !!timeline?.changed ||
  (timeline?.status === TimelineStatusEnum.draft && timeline?.updated != null);

interface FetchTimelinesResult {
  models: TimelineModel[];
  failedIds: string[];
}

const fetchTimelines = async (savedObjectIds: string[]): Promise<FetchTimelinesResult> => {
  const settled = await Promise.allSettled(savedObjectIds.map((id) => resolveTimeline(id)));
  const failedIds: string[] = [];
  const models = settled
    .map((result, idx) => {
      if (result.status === 'rejected') {
        failedIds.push(savedObjectIds[idx]);
        return null;
      }
      return formatTimelineResponseToModel(result.value.timeline).timeline;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
  return { models, failedIds };
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook that opens a Super Timeline from a list of saved object IDs.
 *
 * Fetches all source timelines in parallel, aggregates their pinned events, notes, and KQL
 * queries (via buildSuperTimelineModel), then loads the result into the active timeline slot.
 * The result is transient — it is never persisted.
 *
 * Enforces:
 * - A cap of MAX_SUPER_TIMELINE_COUNT (10) source timelines.
 * - An overwrite-guard confirm dialog when the active timeline has unsaved changes.
 * - A warning toast naming any EQL/ESQL timelines whose queries could not be merged.
 */
export const useOpenSuperTimeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const updateTimeline = useUpdateTimeline();
  const { dataView } = useDataView(PageScope.timeline);
  const browserFields = useBrowserFields(PageScope.timeline);
  const { services } = useKibana();
  const { uiSettings, notifications, overlays } = services;

  const activeTimeline = useSelector((state: State) =>
    selectTimelineById(state, TimelineId.active)
  );

  const openSuperTimeline = useCallback(
    async (savedObjectIds: string[]) => {
      if (savedObjectIds.length > MAX_SUPER_TIMELINE_COUNT) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.securitySolution.timeline.superTimeline.capExceededTitle', {
            defaultMessage: 'Too many timelines selected',
          }),
          text: i18n.translate('xpack.securitySolution.timeline.superTimeline.capExceededText', {
            defaultMessage:
              'You can combine at most {max} timelines into a Super Timeline. Select {max} or fewer.',
            values: { max: MAX_SUPER_TIMELINE_COUNT },
          }),
        });
        return;
      }

      if (savedObjectIds.length < MIN_SUPER_TIMELINE_COUNT) {
        // Caller is responsible for enforcing minimum — the batch action button is disabled for < 2.
        // If somehow reached programmatically, warn rather than silently no-op.
        notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.securitySolution.timeline.superTimeline.tooFewTimelinesTitle',
            { defaultMessage: 'Select at least 2 timelines' }
          ),
          text: i18n.translate(
            'xpack.securitySolution.timeline.superTimeline.tooFewTimelinesText',
            {
              defaultMessage: 'A Super Timeline requires at least {min} source timelines.',
              values: { min: MIN_SUPER_TIMELINE_COUNT },
            }
          ),
        });
        return;
      }

      if (isTimelineDirty(activeTimeline)) {
        const confirmed = await overlays?.openConfirm(
          i18n.translate('xpack.securitySolution.timeline.superTimeline.overwriteConfirmMessage', {
            defaultMessage: 'Opening a Super Timeline will discard your unsaved changes. Continue?',
          }),
          {
            title: i18n.translate(
              'xpack.securitySolution.timeline.superTimeline.overwriteConfirmTitle',
              { defaultMessage: 'Discard unsaved changes?' }
            ),
            confirmButtonText: i18n.translate(
              'xpack.securitySolution.timeline.superTimeline.overwriteConfirmButton',
              { defaultMessage: 'Open Super Timeline' }
            ),
            'data-test-subj': 'superTimeline-overwrite-confirm-modal',
          }
        );
        if (!confirmed) return;
      }

      setIsLoading(true);
      try {
        const { models: timelineModels, failedIds } = await fetchTimelines(savedObjectIds);

        if (failedIds.length > 0) {
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.securitySolution.timeline.superTimeline.partialFetchTitle',
              { defaultMessage: 'Some timelines could not be loaded' }
            ),
            text: i18n.translate('xpack.securitySolution.timeline.superTimeline.partialFetchText', {
              defaultMessage:
                'The following timelines could not be fetched and were skipped: {ids}.',
              values: { ids: failedIds.join(', ') },
            }),
          });
        }

        if (timelineModels.length < MIN_SUPER_TIMELINE_COUNT) {
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.securitySolution.timeline.superTimeline.tooFewSucceededTitle',
              { defaultMessage: 'Not enough timelines loaded' }
            ),
            text: i18n.translate(
              'xpack.securitySolution.timeline.superTimeline.tooFewSucceededText',
              {
                defaultMessage:
                  'At least {min} timelines must load successfully to build a Super Timeline.',
                values: { min: MIN_SUPER_TIMELINE_COUNT },
              }
            ),
          });
          return;
        }

        const esQueryConfig = getEsQueryConfig(uiSettings);
        const { model, skippedQueryTimelines } = buildSuperTimelineModel(timelineModels, {
          dataView,
          browserFields,
          esQueryConfig,
        });

        if (skippedQueryTimelines.length > 0) {
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.securitySolution.timeline.superTimeline.skippedQueryTitle',
              { defaultMessage: 'Some timeline queries could not be merged' }
            ),
            text: i18n.translate('xpack.securitySolution.timeline.superTimeline.skippedQueryText', {
              defaultMessage:
                'The following timelines use EQL or ESQL and their queries were not included: {titles}. Their pinned events and notes are still shown.',
              values: {
                titles: skippedQueryTimelines.map((t) => t.title).join(', '),
              },
            }),
          });
        }

        updateTimeline({
          duplicate: false,
          from: model.dateRange.start,
          to: model.dateRange.end,
          id: TimelineId.active,
          notes: null,
          timeline: {
            ...model,
            show: true,
            activeTab: TimelineTabs.query,
          },
          preventSettingQuery: true,
        });
      } catch (error) {
        notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: i18n.translate('xpack.securitySolution.timeline.superTimeline.errorTitle', {
            defaultMessage: 'Failed to open Super Timeline',
          }),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeTimeline, browserFields, dataView, notifications, overlays, uiSettings, updateTimeline]
  );

  return { openSuperTimeline, isLoading };
};
