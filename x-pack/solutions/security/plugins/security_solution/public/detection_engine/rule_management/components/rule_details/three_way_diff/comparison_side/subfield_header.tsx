/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { fieldToDisplayNameMap } from '../../diff_components/translations';

interface SubfieldHeaderProps {
  subfieldName: string;
}

export function SubfieldHeader({ subfieldName }: SubfieldHeaderProps) {
  const subfieldLabel = fieldToDisplayNameMap[subfieldName] ?? startCase(camelCase(subfieldName));

  return (
    <>
      <EuiTitle size="xxxs">
        <h4>{subfieldLabel}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );
}
