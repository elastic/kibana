/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { NotesDetails } from '../../../../flyout_v2/notes';
import { useDocumentDetailsContext } from '../../shared/context';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { Flyouts } from '../../shared/constants/flyouts';

/**
 * Notes view displayed in the document details expandable flyout left section
 */
export const NotesTab = memo(() => {
  const { searchHit } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as unknown as EsHitRecord), [searchHit]);
  const isTimelineFlyout = useWhichFlyout() === Flyouts.timeline;

  return <NotesDetails hit={hit} isTimelineFlyout={isTimelineFlyout} />;
});

NotesTab.displayName = 'NotesTab';
