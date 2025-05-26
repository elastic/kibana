/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface Props {
  value: string;
  'data-test-subj'?: string;
}

export const CommonField: React.FC<Props> = React.memo(
  ({ value, 'data-test-subj': dataTestSubj }) => {
    return <div data-test-subj={dataTestSubj}>{value}</div>;
  }
);
CommonField.displayName = 'CommonField';
