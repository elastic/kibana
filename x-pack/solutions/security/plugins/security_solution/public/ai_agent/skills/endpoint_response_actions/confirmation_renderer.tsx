/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiCallOut,
} from '@elastic/eui';
import type { ActionType, HostRef } from './types';

interface ConfirmationCardProps {
  hostRef: HostRef;
  actionType: ActionType;
  onConfirm: () => void;
  onCancel: () => void;
}

const IMPACT_STATEMENTS: Record<ActionType, string> = {
  isolate: 'Isolating will sever all network connectivity for this host.',
  unisolate: 'Un-isolating will restore full network connectivity for this host.',
};

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  hostRef,
  actionType,
  onConfirm,
  onCancel,
}) => {
  const listItems = [
    { title: 'Host name', description: hostRef.hostName },
    { title: 'Agent ID', description: hostRef.agentId },
    { title: 'Action', description: actionType === 'isolate' ? 'Isolate host' : 'Un-isolate host' },
  ];

  return (
    <EuiPanel paddingSize="m" hasBorder data-test-subj="endpoint-response-action-confirmation">
      <EuiText size="s">
        <h4>
          {'Confirm '}
          {actionType === 'isolate' ? 'Isolation' : 'Un-isolation'}
        </h4>
      </EuiText>
      <EuiSpacer size="s" />

      <EuiDescriptionList type="column" columnWidths={[1, 2]} listItems={listItems} />

      <EuiSpacer size="m" />

      <EuiCallOut
        title={IMPACT_STATEMENTS[actionType]}
        color={actionType === 'isolate' ? 'warning' : 'primary'}
        iconType={actionType === 'isolate' ? 'warning' : 'check'}
        size="s"
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={onCancel}
            data-test-subj="endpoint-response-action-cancel"
          >
            {'Cancel'}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color={actionType === 'isolate' ? 'warning' : 'primary'}
            fill
            onClick={onConfirm}
            data-test-subj="endpoint-response-action-confirm"
          >
            {'Confirm '}
            {actionType === 'isolate' ? 'Isolation' : 'Un-isolation'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
