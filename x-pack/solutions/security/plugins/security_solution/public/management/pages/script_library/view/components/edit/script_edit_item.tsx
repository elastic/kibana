/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';

export const EndpointScriptEditItem = memo(({ label }: { label: string }) => {
  return (
    <>
      <EuiText>
        <h5>{label}</h5>
      </EuiText>
      <EuiSpacer size="xs" />
    </>
  );
});

EndpointScriptEditItem.displayName = 'EndpointScriptEditItem';
