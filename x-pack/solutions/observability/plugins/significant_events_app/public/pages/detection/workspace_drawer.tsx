/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

export const WorkspaceDrawer = ({
  title,
  description,
  children,
  onClose,
  testSubject,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  testSubject: string;
}): React.ReactElement => {
  const id = useGeneratedHtmlId({ prefix: testSubject });
  return (
    <EuiFlyout
      side="right"
      size="l"
      maxWidth={960}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      data-test-subj={testSubject}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={`${id}-title`}>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {description}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
