/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { ClientMessage } from '@kbn/elastic-assistant';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useAssistantContext } from '@kbn/elastic-assistant/impl/assistant_context';
import { removeContentReferences } from '@kbn/elastic-assistant-common';
import { useKibana, useToasts } from '../../common/lib/kibana';
import type { Note } from '../../common/lib/note';
import { appActions } from '../../common/store/actions';
import { TimelineId } from '../../../common/types';
import { updateAndAssociateNode } from '../../timelines/components/notes/helpers';
import { timelineActions } from '../../timelines/store';
import * as i18n from './translations';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

interface Props {
  message: ClientMessage;
}

function getTextToCopy(content: string): string {
  return removeContentReferences(content);
}

const CommentActionsComponent: React.FC<Props> = ({ message }) => {
  const toasts = useToasts();
  const { cases } = useKibana().services;
  const dispatch = useDispatch();
  const isModelEvaluationEnabled = useIsExperimentalFeatureEnabled('assistantModelEvaluation');

  const { traceOptions } = useAssistantContext();

  const associateNote = useCallback(
    (noteId: string) => dispatch(timelineActions.addNote({ id: TimelineId.active, noteId })),
    [dispatch]
  );

  const updateNote = useCallback(
    (note: Note) => dispatch(appActions.updateNote({ note })),
    [dispatch]
  );

  const content = message.content ?? '';

  const onAddNoteToTimeline = useCallback(() => {
    updateAndAssociateNode({
      associateNote,
      newNote: content,
      updateNewNote: () => {},
      updateNote,
      user: '', // TODO: attribute assistant messages
    });

    toasts.addSuccess(i18n.ADDED_NOTE_TO_TIMELINE);
  }, [associateNote, content, toasts, updateNote]);

  // Attach to case support
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({
    onClose: () => {},
    onSuccess: () => {},
  });

  const onAddToExistingCase = useCallback(() => {
    selectCaseModal.open({
      getAttachments: () => [
        {
          comment: content,
          type: AttachmentType.user,
          owner: i18n.ELASTIC_AI_ASSISTANT,
        },
      ],
    });
  }, [content, selectCaseModal]);

  // Note: This feature is behind the `isModelEvaluationEnabled` FF. If ever released, this URL should be configurable
  // as APM data may not go to the same cluster where the Kibana instance is running
  // Links to the experimental trace explorer page
  // Note: There's a bug with URL params being rewritten, so must specify 'query' to filter on transaction id
  // See: https://github.com/elastic/kibana/issues/171368
  const apmTraceLink =
    message.traceData != null && Object.keys(message.traceData).length > 0
      ? `${traceOptions.apmUrl}/traces/explorer/waterfall?comparisonEnabled=false&detailTab=timeline&environment=ENVIRONMENT_ALL&kuery=&query=transaction.id:%20${message.traceData.transactionId}&rangeFrom=now-1y/d&rangeTo=now&showCriticalPath=false&traceId=${message.traceData.traceId}&transactionId=${message.traceData.transactionId}&type=kql&waterfallItemId=`
      : undefined;

  // Use this link for routing to the services/transactions view which provides a slightly different view
  // const apmTraceLink =
  //     message.traceData != null
  //         ? `${basePath}/app/apm/services/kibana/transactions/view?kuery=&rangeFrom=now-1y&rangeTo=now&environment=ENVIRONMENT_ALL&serviceGroup=&comparisonEnabled=true&traceId=${message.traceData.traceId}&transactionId=${message.traceData.transactionId}&transactionName=POST%20/internal/elastic_assistant/actions/connector/?/_execute&transactionType=request&offset=1d&latencyAggregationType=avg`
  //         : undefined;

  const textToCopy = getTextToCopy(content);

  return (
    // APM Trace support is currently behind the Model Evaluation feature flag until wider testing is performed
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {isModelEvaluationEnabled && apmTraceLink != null && (
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={i18n.VIEW_APM_TRACE}>
            <EuiButtonIcon
              aria-label={i18n.VIEW_APM_TRACE}
              color="primary"
              iconType="apmTrace"
              href={apmTraceLink}
              target={'_blank'}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={i18n.ADD_NOTE_TO_TIMELINE}>
          <EuiButtonIcon
            aria-label={i18n.ADD_MESSAGE_CONTENT_AS_TIMELINE_NOTE}
            color="primary"
            iconType="editorComment"
            onClick={onAddNoteToTimeline}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={i18n.ADD_TO_CASE_EXISTING_CASE}>
          <EuiButtonIcon
            aria-label={i18n.ADD_TO_CASE_EXISTING_CASE}
            color="primary"
            iconType="addDataApp"
            onClick={onAddToExistingCase}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={i18n.COPY_TO_CLIPBOARD}>
          <EuiCopy textToCopy={textToCopy}>
            {(copy) => (
              <EuiButtonIcon
                aria-label={i18n.COPY_TO_CLIPBOARD}
                color="primary"
                iconType="copyClipboard"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CommentActions = React.memo(CommentActionsComponent);
