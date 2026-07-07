/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useSelector } from 'react-redux';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { NotesRemoteCallout } from '../../../../flyout_v2/shared/tools/notes/components/notes_remote_callout';
import type { State } from '../../../../common/store';
import { timelineSelectors } from '../../../../timelines/store';
import { TimelineId } from '../../../../../common/types';
import { useTimelineConfig } from '../../../../flyout_v2/shared/tools/notes/hooks/use_timeline_config';
import { NotesDetailsContent } from '../../../../flyout_v2/shared/tools/notes/components/notes_details_content';
import { useDocumentDetailsContext } from '../../shared/context';

/**
 * Notes view displayed in the document details expandable flyout left section
 */
export const NotesTab = memo(() => {
  const { searchHit } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as unknown as EsHitRecord), [searchHit]);
  const eventId = hit.raw._id ?? '';

  const isTimelineOpen = useSelector(
    (state: State) => timelineSelectors.selectTimelineById(state, TimelineId.active)?.show ?? false
  );
  const timelineConfig = useTimelineConfig(eventId, isTimelineOpen);

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <NotesRemoteCallout hit={hit}>
        <EuiSpacer size="m" />
      </NotesRemoteCallout>
      <NotesDetailsContent hit={hit} timelineConfig={timelineConfig} hideTimelineIcon={false} />
    </EuiPanel>
  );
});

NotesTab.displayName = 'NotesTab';
