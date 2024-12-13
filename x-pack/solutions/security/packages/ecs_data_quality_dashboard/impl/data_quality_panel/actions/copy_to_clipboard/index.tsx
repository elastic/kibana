/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIcon, EuiLink, copyToClipboard } from '@elastic/eui';

import { useDataQualityContext } from '../../data_quality_context';
import { COPIED_RESULTS_TOAST_TITLE, COPY_TO_CLIPBOARD } from '../../translations';
import { StyledLinkText } from '../styles';

interface Props {
  markdownComment: string;
}

const CopyToClipboardActionComponent: React.FC<Props> = ({ markdownComment }) => {
  const { addSuccessToast, ilmPhases } = useDataQualityContext();
  const onCopy = useCallback(() => {
    copyToClipboard(markdownComment);

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, markdownComment]);

  return (
    <EuiLink
      aria-label={COPY_TO_CLIPBOARD}
      data-test-subj="copyToClipboard"
      disabled={ilmPhases.length === 0}
      onClick={onCopy}
    >
      <StyledLinkText>
        <EuiIcon type="copyClipboard" />
        {COPY_TO_CLIPBOARD}
      </StyledLinkText>
    </EuiLink>
  );
};

CopyToClipboardActionComponent.displayName = 'CopyToClipboardActionComponent';

export const CopyToClipboardAction = React.memo(CopyToClipboardActionComponent);
