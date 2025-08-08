/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AttackDiscoveryWidget } from './attack_discovery_widget';
import { ATTACK_DISCOVERY_SECTION_TEST_ID } from '..';
import { useAIForSOCDetailsContext } from '../context';

const ATTACK_DISCOVERY = i18n.translate(
  'xpack.securitySolution.alertSummary.attackDiscoverySection.title',
  {
    defaultMessage: 'Attack Discovery',
  }
);

/**
 * Panel to be displayed in AI for SOC alert summary flyout
 */
export const AttackDiscoverySection = memo(() => {
  const { eventId } = useAIForSOCDetailsContext();

  return (
    <div data-test-subj={ATTACK_DISCOVERY_SECTION_TEST_ID}>
      <EuiTitle size={'s'}>
        <h2>{ATTACK_DISCOVERY}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AttackDiscoveryWidget alertId={eventId} />
    </div>
  );
});

AttackDiscoverySection.displayName = 'AttackDiscoverySection';
