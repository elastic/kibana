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
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { NotificationsStart } from '@kbn/core/public';
import { usePageSummary } from '../../hooks/use_page_summary';

interface AddToCaseCommentProps {
  comment: string;
  onCommentChange: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  notifications: NotificationsStart;
}

export function AddToCaseComment({
  comment,
  onCommentChange,
  setIsLoading,
  observabilityAIAssistant,
  notifications,
}: AddToCaseCommentProps) {
  const handleStreamingUpdate = useCallback(
    (partialSummary: string) => {
      onCommentChange((prevComment) => (prevComment || '') + partialSummary); // Append new data
    },
    [onCommentChange]
  );

  const { generateSummary, isObsAIAssistantEnabled, isLoading, errors } = usePageSummary({
    onChunk: handleStreamingUpdate, // Add streaming update handler
    observabilityAIAssistant,
  });

  useEffect(() => {
    if (isObsAIAssistantEnabled) {
      generateSummary();
    }
  }, [generateSummary, isObsAIAssistantEnabled]);

  useEffect(() => {
    if (isObsAIAssistantEnabled && isLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [isObsAIAssistantEnabled, isLoading, setIsLoading]);

  useEffect(() => {
    if (errors.length > 0) {
      errors.forEach((error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.observabilityShared.cases.addPageToCaseModal.errorGeneratingSummary',
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
      placeholder={i18n.translate(
        'xpack.observabilityShared.cases.addPageToCaseModal.commentPlaceholder',
        {
          defaultMessage: 'Add a comment (optional)',
        }
      )}
      onChange={(e) => {
        onCommentChange(e.target.value);
      }}
      value={comment || ''}
      fullWidth
      rows={5}
    />
  );

  const showAIEnhancedExperience = isObsAIAssistantEnabled && !errors.length;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.observabilityShared.cases.addPageToCaseModal.commentLabel', {
          defaultMessage: 'Add a comment (optional)',
        })}
        helpText={
          showAIEnhancedExperience ? (
            <FormattedMessage
              id="xpack.observabilityShared.cases.addPageToCaseModal.commentHelpText"
              defaultMessage="{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary."
              values={{ icon: <EuiIcon type="sparkles" /> }}
            />
          ) : undefined
        }
        fullWidth
      >
        {showAIEnhancedExperience ? (
          !isLoading ? (
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
