/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckableCard, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';

import * as i18n from '../translations';

export type RetrievalMethod = 'legacy' | 'workflows';

export interface RetrievalMethodSelectorProps {
  onMethodChange: (method: RetrievalMethod) => void;
  selectedMethod: RetrievalMethod;
}

const LEGACY_ID = 'retrievalMethodLegacy';
const WORKFLOWS_ID = 'retrievalMethodWorkflows';
const RADIO_GROUP_NAME = 'retrievalMethod';

const fullWidthCardStyle = css`
  width: 100%;
`;

const RetrievalMethodSelectorComponent: React.FC<RetrievalMethodSelectorProps> = ({
  onMethodChange,
  selectedMethod,
}) => {
  const handleLegacyChange = useCallback(() => {
    onMethodChange('legacy');
  }, [onMethodChange]);

  const handleWorkflowsChange = useCallback(() => {
    onMethodChange('workflows');
  }, [onMethodChange]);

  return (
    <EuiFormRow data-test-subj="retrievalMethodSelector" label={i18n.RETRIEVAL_METHOD_LABEL}>
      <EuiFlexGroup gutterSize="s" wrap={false}>
        <EuiFlexItem>
          <EuiCheckableCard
            checked={selectedMethod === 'legacy'}
            css={fullWidthCardStyle}
            data-test-subj="retrievalMethodLegacyCard"
            id={LEGACY_ID}
            label={i18n.BUILT_IN_LEGACY}
            name={RADIO_GROUP_NAME}
            onChange={handleLegacyChange}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCheckableCard
            checked={selectedMethod === 'workflows'}
            css={fullWidthCardStyle}
            data-test-subj="retrievalMethodWorkflowsCard"
            id={WORKFLOWS_ID}
            label={i18n.WORKFLOWS}
            name={RADIO_GROUP_NAME}
            onChange={handleWorkflowsChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

RetrievalMethodSelectorComponent.displayName = 'RetrievalMethodSelector';

export const RetrievalMethodSelector = React.memo(RetrievalMethodSelectorComponent);
RetrievalMethodSelector.displayName = 'RetrievalMethodSelector';
