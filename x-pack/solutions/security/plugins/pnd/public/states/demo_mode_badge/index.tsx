/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { useIsDemoMode } from '../../hooks/use_pnd_client_config';
import * as i18n from '../translations';

/**
 * Shown whenever `xpack.pnd.demo.forceIncident` is on.
 *
 * A run that skipped the assessment must never look like a real verdict, so
 * this badge belongs beside anything that presents one — the queue, a proposal
 * card, the four-phase view. It renders nothing when demo mode is off, which is
 * the default.
 */
export const DemoModeBadge: React.FC = () => {
  const isDemoMode = useIsDemoMode();

  if (!isDemoMode) {
    return null;
  }

  return (
    <EuiToolTip content={i18n.DEMO_MODE_TOOLTIP}>
      {/* focusable so the tooltip — which says more than the label does — is reachable */}
      <EuiBadge color="warning" data-test-subj="pndDemoModeBadge" iconType="warning" tabIndex={0}>
        {i18n.DEMO_MODE_LABEL}
      </EuiBadge>
    </EuiToolTip>
  );
};
