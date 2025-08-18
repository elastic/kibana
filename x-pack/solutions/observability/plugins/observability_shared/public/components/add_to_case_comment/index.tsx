/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface AddToCaseCommentProps {
  comment: string;
  onCommentChange: (comment: string) => void;
}

export function AddToCaseComment({ comment, onCommentChange }: AddToCaseCommentProps) {
  const input = (
    <EuiTextArea
      data-test-subj="syntheticsAddToCaseCommentTextArea"
      onChange={(e) => {
        onCommentChange(e.target.value);
      }}
      value={comment}
      fullWidth
      rows={5}
    />
  );

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.observabilityShared.cases.addPageToCaseModal.commentLabel', {
          defaultMessage: 'Add a comment (optional)',
        })}
        fullWidth
      >
        {input}
      </EuiFormRow>
    </>
  );
}
