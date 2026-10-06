/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineTypeEnum, type TimelineType } from '../../../../common/api/timeline';
import { useCreateTimeline } from '../../hooks/use_create_timeline';
import { ALL_TIMELINES_IMPORT_TIMELINE_TITLE } from '../translations';

const NEW_TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.timelines.newTimelineButtonLabel',
  { defaultMessage: 'Create new Timeline' }
);
const NEW_TEMPLATE_TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.timelines.newTemplateTimelineButtonLabel',
  { defaultMessage: 'Create new Timeline template' }
);

export const IMPORT_TIMELINE_MENU_ITEM_TEST_ID = 'timelines-page-open-import-data';
export const NEW_TIMELINE_MENU_ITEM_TEST_ID = 'timelines-page-new';

interface UseTimelinesHeaderMenuParams {
  /** Whether the current user can import/create timelines */
  canWriteTimeline: boolean;
  /** Type of timeline the "Create new Timeline" action creates (default or template) */
  timelineType: TimelineType;
  /** Opens the import timeline modal */
  onImportClick: () => void;
}

/**
 * Builds the Timelines page app header menu: an "Import" item (only when the user can write
 * timelines) and a "Create new Timeline" primary action, replacing the page's former button row.
 */
export const useTimelinesHeaderMenu = ({
  canWriteTimeline,
  timelineType,
  onImportClick,
}: UseTimelinesHeaderMenuParams): AppHeaderMenu => {
  const createNewTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType,
  });

  return useMemo<AppHeaderMenu>(
    () => ({
      items: canWriteTimeline
        ? [
            {
              id: 'importTimeline',
              label: ALL_TIMELINES_IMPORT_TIMELINE_TITLE,
              iconType: 'indexOpen',
              run: onImportClick,
              testId: IMPORT_TIMELINE_MENU_ITEM_TEST_ID,
            },
          ]
        : [],
      primaryActionItem: {
        id: 'newTimeline',
        label:
          timelineType === TimelineTypeEnum.default
            ? NEW_TIMELINE_LABEL
            : NEW_TEMPLATE_TIMELINE_LABEL,
        iconType: 'plusCircle',
        run: () => {
          void createNewTimeline();
        },
        testId: NEW_TIMELINE_MENU_ITEM_TEST_ID,
      },
    }),
    [canWriteTimeline, createNewTimeline, onImportClick, timelineType]
  );
};
