/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';

export interface FooterProps {
  /**
   * The unique identifier of the cloud resource associated with the misconfiguration.
   */
  resourceId: string;
  /**
   * The unique identifier of the CSP rule that was evaluated.
   */
  ruleId: string;
}

/**
 * Footer content for the misconfiguration finding flyout containing the take action button.
 * The `createRuleFn` factory is produced by the cloud security posture plugin via its `.Component`
 * render prop, keeping rule-creation logic in that plugin. The surrounding `EuiFlyoutFooter` is
 * owned by the flyout `index`, matching the other flyout_v2 flyouts.
 */
export const Footer: FC<FooterProps> = memo(({ resourceId, ruleId }: FooterProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  return (
    <CspFlyout.Component resourceId={resourceId} ruleId={ruleId}>
      {({ createRuleFn }) => (
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <CspFlyout.TakeAction createRuleFn={createRuleFn} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </CspFlyout.Component>
  );
});

Footer.displayName = 'Footer';
