/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

export interface RunscriptConfigProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

export const RunscriptConfig = memo<RunscriptConfigProps>((props) => {
  return <div>{'RunscriptConfig placeholder'}</div>;
});
RunscriptConfig.displayName = 'RunscriptConfig';
