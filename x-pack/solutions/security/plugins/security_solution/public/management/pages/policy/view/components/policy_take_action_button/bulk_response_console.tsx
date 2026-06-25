/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

export interface BulkResponseConsoleProps {
  // TODO:PT define props

  'data-test-subj'?: string;
}

export const BulkResponseConsole = memo<BulkResponseConsoleProps>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return <div data-test-subj={getTestId()}>{'a console here'}</div>;
  }
);
BulkResponseConsole.displayName = 'BulkResponseConsole';
