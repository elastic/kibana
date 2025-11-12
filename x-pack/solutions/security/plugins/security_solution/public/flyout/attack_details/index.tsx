/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { AttackDetailsProps } from './types';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { FlyoutBody } from '../shared/components/flyout_body';
import { useAttackDetailsContext } from './context';
import { PanelFooter } from './footer';
import { HeaderTitle } from './components/header_title';

export const FLYOUT_BODY_TEST_ID = 'attack-details-flyout-body';

/**
 * Panel to be displayed in Attack Details flyout
 */
export const AttackDetailsPanel: React.FC<Partial<AttackDetailsProps>> = memo(() => {
  const { documentId } = useAttackDetailsContext();

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>
        <HeaderTitle />
      </FlyoutHeader>
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>{documentId}</FlyoutBody>
      <PanelFooter />
    </>
  );
});

AttackDetailsPanel.displayName = 'AttackDetailsPanel';
