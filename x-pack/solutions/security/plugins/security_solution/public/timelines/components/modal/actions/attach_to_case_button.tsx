/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { UNTITLED_TIMELINE } from '../../timeline/properties/translations';
import { selectTimelineById } from '../../../store/selectors';
import type { State } from '../../../../common/store';
import { APP_ID, APP_UI_ID } from '../../../../../common/constants';
import { setInsertTimeline, showTimeline } from '../../../store/actions';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';
import { TimelineStatusEnum, TimelineTypeEnum } from '../../../../../common/api/timeline';
import { getCaseDetailsUrl, getCreateCaseUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';

interface AttachToCaseButtonProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
}

/**
 * Button that opens the case selector modal to attach the timeline to a case. The modal itself
 * offers a button to create a new case.
 *
 * When the cases attachments framework flag is enabled, the timeline is created as a
 * proper `security.timeline` case attachment. Otherwise it falls back to the legacy flow,
 * which navigates the user to the case and inserts a markdown `[title](url)` link into
 * the comment editor via redux.
 */
export const AttachToCaseButton = React.memo<AttachToCaseButtonProps>(({ timelineId }) => {
  const dispatch = useDispatch();
  const {
    savedObjectId,
    status: timelineStatus,
    title: timelineTitle,
    timelineType,
  } = useSelector((state: State) => selectTimelineById(state, timelineId));

  const {
    cases,
    application: { navigateToApp },
  } = useKibana().services;
  const userCasesPermissions = useMemo(() => cases.helpers.canUseCases([APP_ID]), [cases]);
  const attachmentsEnabled = cases.config.attachmentsEnabled;
  const addToExistingCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  const [isCaseModalOpen, openCaseModal] = useState(false);

  const closeCaseModal = useCallback(() => openCaseModal(false), []);

  const onLegacyRowClick = useCallback(
    async (theCase?: CaseUI) => {
      closeCaseModal();
      await navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.case,
        path: theCase != null ? getCaseDetailsUrl({ id: theCase.id }) : getCreateCaseUrl(),
      });
      dispatch(
        setInsertTimeline({
          timelineId,
          timelineSavedObjectId: savedObjectId,
          timelineTitle: timelineTitle.length > 0 ? timelineTitle : UNTITLED_TIMELINE,
        })
      );
      if (theCase == null) {
        dispatch(showTimeline({ id: TimelineId.active, show: false }));
      }
    },
    [closeCaseModal, dispatch, navigateToApp, savedObjectId, timelineId, timelineTitle]
  );

  const timelineAttachments: CaseAttachmentsWithoutOwner = useMemo(
    () =>
      savedObjectId
        ? [
            {
              type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
              attachmentId: savedObjectId,
              metadata: { title: timelineTitle.length > 0 ? timelineTitle : UNTITLED_TIMELINE },
            },
          ]
        : [],
    [savedObjectId, timelineTitle]
  );

  const attachToCase = useCallback(() => {
    if (attachmentsEnabled) {
      addToExistingCaseModal.open({ getAttachments: () => timelineAttachments });
      return;
    }
    openCaseModal(true);
  }, [addToExistingCaseModal, attachmentsEnabled, timelineAttachments]);

  return (
    <>
      <EuiButtonEmpty
        disabled={
          timelineStatus === TimelineStatusEnum.draft || timelineType !== TimelineTypeEnum.default
        }
        data-test-subj="timeline-modal-attach-to-case-button"
        onClick={attachToCase}
      >
        {i18n.ATTACH_TO_CASE}
      </EuiButtonEmpty>
      {!attachmentsEnabled &&
        isCaseModalOpen &&
        cases.ui.getAllCasesSelectorModal({
          onRowClick: onLegacyRowClick,
          onClose: closeCaseModal,
          owner: [APP_ID],
          permissions: userCasesPermissions,
        })}
    </>
  );
});

AttachToCaseButton.displayName = 'AttachToCaseButton';
