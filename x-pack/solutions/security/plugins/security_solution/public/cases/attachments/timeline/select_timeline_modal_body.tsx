/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import React, { memo } from 'react';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { SelectableTimeline } from '../../../timelines/components/timeline/selectable_timeline';
import type { OpenTimelineResult } from '../../../timelines/components/open_timeline/types';

const handleGetSelectableOptions = ({ timelines }: { timelines: OpenTimelineResult[] }) =>
  timelines.map(
    (t, index) =>
      ({
        description: t.description,
        favorite: t.favorite,
        label: t.title,
        id: t.savedObjectId,
        key: `${t.title}-${index}`,
        title: t.title,
        checked: undefined,
      } as EuiSelectableOption)
  );

/**
 * Body of the timeline picker. Shared between the markdown-editor timeline button
 * and the case-view attach button
 */
export const SelectTimelineModalBody: React.FC<{
  onTimelineChange: (title: string, savedObjectId: string | null) => void;
  onClose: () => void;
}> = memo(({ onTimelineChange, onClose }) => (
  <SelectableTimeline
    hideUntitled={true}
    getSelectableOptions={handleGetSelectableOptions}
    onTimelineChange={onTimelineChange}
    onClosePopover={onClose}
    timelineType={TimelineTypeEnum.default}
  />
));

SelectTimelineModalBody.displayName = 'SelectTimelineModalBody';
