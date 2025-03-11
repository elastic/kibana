/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiPanelProps,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';

interface StepModalProps {
  title?: string;
  panelProps?: EuiPanelProps;
  panelFooter?: ReactNode;
  children?: ReactNode;
}

export function StepModal(props: StepModalProps) {
  const { title, children, panelFooter } = props;
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{children}</EuiModalBody>
      <EuiModalFooter>{panelFooter}</EuiModalFooter>
    </>
  );
}
