/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiAccordion, EuiCodeBlock, EuiTitle } from '@elastic/eui';

export function CodeBlockAccordion({
  id,
  label,
  json,
  extraAction,
  children,
}: {
  id: string;
  label: string;
  json?: any;
  extraAction?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <EuiAccordion
      id={id}
      extraAction={extraAction}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{label}</h3>
        </EuiTitle>
      }
    >
      {children ?? (
        <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable={true}>
          {JSON.stringify(json, null, 2)}
        </EuiCodeBlock>
      )}
    </EuiAccordion>
  );
}
