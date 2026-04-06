/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiLink } from '@elastic/eui';
import React from 'react';

interface Props {
  dataTestSubj: string;
  buttonLabel: string;
  buttonHref: string;
}
export const TopNavLinks: React.FC<Props> = ({ buttonLabel, buttonHref, dataTestSubj }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiLink data-test-subj={dataTestSubj} href={buttonHref} aria-label={buttonLabel}>
        {buttonLabel}
      </EuiLink>
    </EuiFlexItem>
  );
};
