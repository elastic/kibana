/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTextArea, EuiFormRow, EuiSkeletonText, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { NotificationsStart } from '@kbn/core/public';
import { usePageSummary } from '../../hooks/use_page_summary';

interface AddToCaseCommentProps {
  comment: string;
  setComment: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  notifications: NotificationsStart;
}

export function AddToCaseComment({
  comment,
  setComment,
  setIsLoading,
  observabilityAIAssistant,
  notifications,
}: AddToCaseCommentProps) {
  const handleStreamingUpdate = useCallback(
    (partialSummary: string) => {
      setComment((prevComment) => prevComment + partialSummary);
    },
    [setComment]
  );

  const { generateSummary, isObsAIAssistantEnabled, errors, isComplete } = usePageSummary({
    onChunk: handleStreamingUpdate,
    observabilityAIAssistant,
  });

  useEffect(() => {
    if (isObsAIAssistantEnabled && !isComplete) {
      generateSummary();
    }
  }, [generateSummary, isObsAIAssistantEnabled, isComplete]);

  useEffect(() => {
    if (isObsAIAssistantEnabled && !isComplete) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [isObsAIAssistantEnabled, isComplete, setIsLoading]);

  useEffect(() => {
    if (errors.length > 0) {
      errors.forEach((error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.observability.cases.addPageToCaseModal.errorGeneratingSummary',
            {
              defaultMessage: 'Could not initialize AI-generated summary',
            }
          ),
        });
      });
    }
  }, [errors, notifications]);

  const input = (
    <EuiTextArea
      data-test-subj="syntheticsAddToCaseCommentTextArea"
      onChange={(e) => {
        setComment(e.target.value);
      }}
      value={comment}
      fullWidth
      rows={5}
    />
  );

  const showAIEnhancedExperience = isObsAIAssistantEnabled && !errors.length;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.observability.cases.addPageToCaseModal.commentLabel', {
          defaultMessage: 'Add a comment (optional)',
        })}
        helpText={
          showAIEnhancedExperience ? (
            <FormattedMessage
              id="xpack.observability.cases.addPageToCaseModal.commentHelpText"
              defaultMessage="{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary."
              values={{ icon: <EuiIcon type="sparkles" /> }}
            />
          ) : undefined
        }
        fullWidth
      >
        {showAIEnhancedExperience ? (
          comment || isComplete ? (
            input
          ) : (
            <EuiSkeletonText data-test-subj="addPageToCaseCommentSkeleton" lines={5} />
          )
        ) : (
          input
        )}
      </EuiFormRow>
    </>
  );
}
