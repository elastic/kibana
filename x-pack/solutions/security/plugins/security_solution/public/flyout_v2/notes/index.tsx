/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiPanel, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import { useTimelineConfig } from './hooks/use_timeline_config';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import type { State } from '../../common/store';
import { timelineSelectors } from '../../timelines/store';
import { TimelineId } from '../../../common/types';
import {
  FETCH_NOTES_ERROR,
  NO_NOTES,
  NotesDetailsContent,
} from './components/notes_details_content';
import { NOTES_DETAILS_TEST_ID } from './test_ids';

export { FETCH_NOTES_ERROR, NO_NOTES };

const TITLE = i18n.translate('xpack.securitySolution.flyout.notes.title', {
  defaultMessage: 'Notes',
});

export interface NotesDetailsProps {
  /**
   * Document record used to fetch and associate notes and to derive the document type.
   */
  hit: DataTableRecord;
}

/**
 * List all the notes for a document id and allows to create new notes associated with that document.
 * Displayed in the document details expandable flyout left section.
 */
export const NotesDetails = memo(({ hit }: NotesDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const eventId = hit.raw._id ?? '';

  const isTimelineOpen = useSelector(
    (state: State) => timelineSelectors.selectTimelineById(state, TimelineId.active)?.show ?? false
  );
  const timelineConfig = useTimelineConfig(eventId, isTimelineOpen);

  const isInSecurityApp = useIsInSecurityApp();

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block-end: ${euiTheme.size.m} !important;
        `}
      >
        <ToolsFlyoutHeader hit={hit} title={TITLE} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiPanel data-test-subj={NOTES_DETAILS_TEST_ID} hasBorder={false} hasShadow={false}>
          <NotesDetailsContent
            hit={hit}
            timelineConfig={timelineConfig}
            hideTimelineIcon={!isInSecurityApp}
          />
        </EuiPanel>
      </EuiFlyoutBody>
    </>
  );
});

NotesDetails.displayName = 'NotesDetails';
