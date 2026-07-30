/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ProcessResult } from './process_result';
import type { ProcessTreeNode } from '../utils/build_process_tree';
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

    return useMemo(() => {
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

      const buildDisplayTree = (treeNode: ProcessTreeNode): React.ReactNode => {
        const hasChildren = Object.keys(treeNode.children).length > 0;

        return (
          <TreeNode
            key={`pid-${treeNode.data.pid}`}
            data-test-subj={getTestId(String(treeNode.data.pid ?? 'pid'))}
            process={treeNode.data}
          >
            {hasChildren &&
              Object.values(treeNode.children).map((childNode: ProcessTreeNode) =>
                buildDisplayTree(childNode)
              )}
          </TreeNode>
        );
      };

      return Object.values(processTreeNodes).map((node: ProcessTreeNode) => buildDisplayTree(node));
    }, [getTestId, processList.length, processTreeNodes]);
  }
);
ProcessTree.displayName = 'ProcessTree';

interface TreeNodeProps {
  process: KilledProcessDescendant;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

const TreeNode = memo<TreeNodeProps>(({ process, children, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  return (
    <EuiFlexGroup data-test-subj={getTestId()} responsive={false} gutterSize="xs" wrap={false}>
      <EuiFlexItem grow={false}>{'+'}</EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" responsive={false} gutterSize="xs" wrap={false}>
          <EuiFlexItem grow={false} data-test-subj={getTestId('details')}>
            <ProcessResult command={'kill-process'} processResult={process} />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj={getTestId('children')}>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
TreeNode.displayName = 'TreeNode';
