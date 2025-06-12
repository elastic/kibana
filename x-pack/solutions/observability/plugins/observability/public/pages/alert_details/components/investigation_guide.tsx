/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiButton, EuiSpacer, EuiMarkdownFormat } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export function InvestigationGuide({
  blob,
  createGuide,
}: {
  blob?: string;
  createGuide: () => void;
}): React.FC {
  return blob ? (
    <>
      <EuiSpacer size="m" />
      <EuiMarkdownFormat
        css={css`
          word-wrap: break-word;
        `}
      >
        {blob}
      </EuiMarkdownFormat>
    </>
  ) : (
    <EuiEmptyPrompt
      iconType="logoObservability"
      iconColor="default"
      title={<h3>Add an Investigation Guide</h3>}
      titleSize="m"
      body={<p>Add a guide to your alert's rule.</p>}
      actions={
        <EuiButton
          data-test-subj="xpack.observability.alertDetails.investigationGuide.emptyPrompt.addGuide"
          color="primary"
        >
          Add guide
        </EuiButton>
      }
    />
  );
}
