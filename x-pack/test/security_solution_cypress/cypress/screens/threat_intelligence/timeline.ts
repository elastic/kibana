/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON = getDataTestSubjectSelector(
  'tiIndicatorTableInvestigateInTimelineButtonIcon'
);
export const UNTITLED_TIMELINE_BUTTON = getDataTestSubjectSelector(
  `timeline-bottom-bar-title-button`
);
export const INDICATORS_TABLE_CELL_TIMELINE_BUTTON = `${getDataTestSubjectSelector(
  'tiIndicatorsTableCellTimelineButton'
)} button`;
export const TIMELINE_DATA_PROVIDERS_WRAPPER = getDataTestSubjectSelector(`dataProviders`);
export const TIMELINE_DRAGGABLE_ITEM = getDataTestSubjectSelector(`providerContainer`);
export const TIMELINE_AND_OR_BADGE = getDataTestSubjectSelector(`and-or-badge`);
export const CLOSE_TIMELINE_BTN = '[data-test-subj="timeline-modal-header-close-button"]';
export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutOverviewTableRowTimelineButton'
);
export const FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON = getDataTestSubjectSelector(
  'tiFlyoutOverviewHighLevelBlocksTimelineButton'
);
export const FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM = getDataTestSubjectSelector(
  'tiIndicatorFlyoutInvestigateInTimelineContextMenu'
);
