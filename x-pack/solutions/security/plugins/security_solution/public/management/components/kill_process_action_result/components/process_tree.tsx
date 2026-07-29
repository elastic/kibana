/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildProcessTree } from '../utils/build_process_tree';
import type { KilledProcessDescendant } from '../../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export interface ProcessTreeProps {
  processList: KilledProcessDescendant[];
  'data-test-subj'?: string;
}

export const ProcessTree = memo<ProcessTreeProps>(
  ({ processList, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const processTreeNodes = useMemo(() => {
      return buildProcessTree(processList);
    }, [processList]);

    if (processList.length === 0) {
      return (
        <div data-test-subj={getTestId()}>
          <FormattedMessage
            id="xpack.securitySolution.killProcessActionResult.processTree.noProcesses"
            defaultMessage="No process descendants information available for display"
          />
        </div>
      );
    }

    return <div data-test-subj={getTestId()}>{'ProcessTree placeholder'}</div>;
  }
);
ProcessTree.displayName = 'ProcessTree';
