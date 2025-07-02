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
import { usePageSummary } from '../../hooks/use_page_summary';

interface AddToCaseCommentProps {
  comment: string;
  onCommentChange: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AddToCaseComment({
  comment,
  onCommentChange,
  setIsLoading,
}: AddToCaseCommentProps) {
  const handleStreamingUpdate = useCallback(
    (partialSummary: string) => {
      onCommentChange((prevComment) => (prevComment || '') + partialSummary); // Append new data
    },
    [onCommentChange]
  );

  const { generateSummary, isObsAIAssistantEnabled, isLoading } = usePageSummary({
    onChunk: handleStreamingUpdate, // Add streaming update handler
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

  const input = (
    <EuiTextArea
      data-test-subj="syntheticsAddToCaseCommentTextArea"
      placeholder={i18n.translate('xpack.synthetics.cases.addToCaseModal.commentPlaceholder', {
        defaultMessage: 'Add a comment (optional)',
      })}
      onChange={(e) => {
        onCommentChange(e.target.value);
      }}
      value={comment || ''}
      fullWidth
      rows={5}
    />
  );

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.synthetics.cases.addToCaseModal.commentLabel', {
          defaultMessage: 'Add a comment (optional)',
        })}
        helpText={
          <FormattedMessage
            id="xpack.synthetics.cases.addToCaseModal.commentHelpText"
            defaultMessage="{icon} Initial comment AI generated. AI can be wrong or incomplete. Please review and edit as necessary."
            values={{ icon: <EuiIcon type="sparkles" /> }}
          />
        }
        fullWidth
      >
        {isObsAIAssistantEnabled ? (
          !isLoading ? (
            input
          ) : (
            <EuiSkeletonText data-test-subj="syntheticsAddToCaseCommentSkeleton" lines={5} />
          )
        ) : (
          input
        )}
      </EuiFormRow>
    </>
  );
}
