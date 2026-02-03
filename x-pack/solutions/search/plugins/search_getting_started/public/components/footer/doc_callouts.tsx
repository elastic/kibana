/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';

export interface DocCalloutsProps {
  title: string;
  description: string;
  buttonHref: string;
  buttonLabel: string;
  dataTestSubj: string;
}

export const DocCallouts: React.FC<DocCalloutsProps> = ({
  title,
  description,
  buttonHref,
  buttonLabel,
  dataTestSubj,
}) => {
  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <span>
        <EuiButtonEmpty
          href={buttonHref}
          target="_blank"
          iconType="popout"
          iconSide="right"
          flush="left"
          data-test-subj={dataTestSubj}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiButtonEmpty>
      </span>
    </>
  );
};
