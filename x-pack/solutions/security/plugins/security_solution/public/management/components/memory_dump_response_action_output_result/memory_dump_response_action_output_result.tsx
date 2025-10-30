/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionMemoryDumpOutputContent,
  ResponseActionMemoryDumpParameters,
} from '../../../../common/endpoint/types';

export interface MemoryDumpResponseActionOutputResultProps {
  action: MaybeImmutable<
    ActionDetails<ResponseActionMemoryDumpOutputContent, ResponseActionMemoryDumpParameters>
  >;
}

export const MemoryDumpResponseActionOutputResult = memo<MemoryDumpResponseActionOutputResultProps>(
  (props) => {
    return <div>{'MemoryDumpResponseActionOutputResult placeholder'}</div>;
  }
);
MemoryDumpResponseActionOutputResult.displayName = 'MemoryDumpResponseActionOutputResult';
