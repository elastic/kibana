/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { RuleResponse } from '@kbn/cloud-security-posture-common';
import { TakeAction } from '../../../../components/take_action';

export const FindingsMisconfigurationFlyoutFooter = ({
  createRuleFn,
}: {
  createRuleFn: (http: any) => Promise<RuleResponse>;
}) => {
  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <TakeAction createRuleFn={createRuleFn} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};

// eslint-disable-next-line import/no-default-export
export default FindingsMisconfigurationFlyoutFooter;
