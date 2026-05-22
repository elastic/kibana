/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { NotesRemoteCallout } from '../../../../flyout_v2/shared/tools/notes/components/notes_remote_callout';
import { NotesDetailsContent } from '../../../../flyout_v2/shared/tools/notes/components/notes_details_content';
import { useTimelineConfig } from '../../../../flyout_v2/shared/tools/notes/hooks/use_timeline_config';
import { useWhichFlyout } from '../../../document_details/shared/hooks/use_which_flyout';
import { Flyouts } from '../../../document_details/shared/constants/flyouts';

export interface NotesTabProps {
  /**
   * The attack-discovery document hit. `documentId` is read from `hit.raw._id`
   * and remote-document detection uses `hit.raw._index` + `hit.flattened`.
   */
  hit: DataTableRecord;
}

/**
 * Notes tab content for the Attack Details flyout left panel. Renders the
 * v2 shared notes UI against the attack hit threaded down from
 * `flyout/attack_details/left/index.tsx`.
 */
export const NotesTab = memo(({ hit }: NotesTabProps) => {
  const attackId = hit.id;
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
