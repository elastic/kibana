/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EuiSpacer } from '@elastic/eui';
import { NotesRemoteCallout } from '../../../../flyout_v2/notes/components/notes_remote_callout';
import { NotesDetailsContent } from '../../../../flyout_v2/notes/components/notes_details_content';
import { useTimelineConfig } from '../../../../flyout_v2/notes/hooks/use_timeline_config';
import { useAttackDetailsContext } from '../../context';
import { useWhichFlyout } from '../../../document_details/shared/hooks/use_which_flyout';
import { Flyouts } from '../../../document_details/shared/constants/flyouts';

/**
 * Notes tab content for the Attack Details flyout left panel.
 */
export const NotesTab = memo(() => {
  const { attackId, searchHit } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as unknown as EsHitRecord), [searchHit]);
  const isTimelineFlyout = useWhichFlyout() === Flyouts.timeline;
  const timelineConfig = useTimelineConfig(attackId, isTimelineFlyout);

  return (
    <>
      <NotesRemoteCallout hit={hit}>
        <EuiSpacer size="m" />
      </NotesRemoteCallout>
      <NotesDetailsContent hit={hit} timelineConfig={timelineConfig} hideTimelineIcon={false} />
    </>
  );
});

NotesTab.displayName = 'NotesTab';
