/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { TimelineStatusEnum } from '../../../../../common/api/timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SaveTimelineModal } from './save_timeline_modal';
import * as i18n from './translations';
import { selectTimelineById } from '../../../store/selectors';
import type { State } from '../../../../common/store';

export interface SaveTimelineButtonProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
  /**
   * Ability to customize the text of the button
   */
  buttonText?: string;
  /**
   * Ability to customize the color of the button
   */
  buttonColor?: EuiButtonProps['color'];
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
}

/**
 * Button that allows user to save the timeline. Clicking it opens the `SaveTimelineModal`.
 * The default 'Save' button text can be overridden by passing the `buttonText` prop.
 */
export const SaveTimelineButton = React.memo<SaveTimelineButtonProps>(
  ({
    timelineId,
    buttonText = i18n.SAVE,
    buttonColor = 'primary',
    'data-test-subj': dataTestSubj = 'timeline-modal-save-timeline',
  }) => {
    const [showEditTimelineOverlay, setShowEditTimelineOverlay] = useState<boolean>(false);
    const toggleSaveTimeline = useCallback(() => setShowEditTimelineOverlay((prev) => !prev), []);

    // Case: 1
    // check if user has crud privileges so that user can be allowed to edit the timeline
    // Case: 2
    // TODO: User may have Crud privileges but they may not have access to timeline index.
    // Do we need to check that?
    const {
      kibanaSecuritySolutionsPrivileges: { crud: canEditTimelinePrivilege },
    } = useUserPrivileges();

    const { status, isSaving } = useSelector((state: State) =>
      selectTimelineById(state, timelineId)
    );

    const canSaveTimeline = canEditTimelinePrivilege && status !== TimelineStatusEnum.immutable;
    const isUnsaved = status === TimelineStatusEnum.draft;
    const unauthorizedMessage = canSaveTimeline ? null : i18n.CALL_OUT_UNAUTHORIZED_MSG;

    return (
      <>
        <EuiToolTip
          content={unauthorizedMessage}
          position="bottom"
          data-test-subj="timeline-modal-save-timeline-tooltip"
        >
          <EuiButton
            fill
            size="s"
            color={buttonColor}
            iconType="save"
            isLoading={isSaving}
            disabled={!canSaveTimeline}
            data-test-subj={dataTestSubj}
            onClick={toggleSaveTimeline}
          >
            {buttonText}
          </EuiButton>
        </EuiToolTip>
        {showEditTimelineOverlay && canSaveTimeline ? (
          <SaveTimelineModal
            initialFocusOn={isUnsaved ? 'title' : 'save'}
            timelineId={timelineId}
            showWarning={false}
            closeSaveTimeline={toggleSaveTimeline}
          />
        ) : null}
      </>
    );
  }
);

SaveTimelineButton.displayName = 'SaveTimelineButton';
