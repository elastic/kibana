/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';

interface Props {
  id: string;
  label: string;
  children: React.ReactNode;
}

export const IntegrationsCategory = ({ id, label, children }: Props) => {
  const labelId = useGeneratedHtmlId({ prefix: 'integrationsCategory', suffix: id });

  return (
    <section aria-labelledby={labelId}>
      <EuiTitle size="xxs">
        <h4 id={labelId}>{label}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
    </section>
  );
};
