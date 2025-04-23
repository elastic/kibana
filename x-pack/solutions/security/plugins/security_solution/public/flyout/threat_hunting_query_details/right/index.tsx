/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { LOADING_TEST_ID } from './test_ids';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutError } from '../../shared/components/flyout_error';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface ThreatHuntingQueryPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'threat-hunting-query-panel';
  params: {
    queryUuid: string;
    isPreviewMode?: boolean;
  };
}

export const ThreatHuntingQueryPanelKey: ThreatHuntingQueryPanelExpandableFlyoutProps['key'] =
  'threat-hunting-query-panel';

export interface ThreatHuntingQueryPanelProps extends Record<string, unknown> {
  /**
   * UUID of the query
   */
  queryUuid: string;
}

/**
 * Displays a rule overview panel
 */
export const ThreatHuntingQueryPanel: FC<ThreatHuntingQueryPanelProps> = memo(({ queryUuid }) => {
  const loading = false;
  const query = queryUuid; // Replace with actual query fetching logic
  return loading ? (
    <FlyoutLoading data-test-subj={LOADING_TEST_ID} />
  ) : query ? (
    <>
      <FlyoutHeader>
        <FlyoutTitle title={query} />
      </FlyoutHeader>
      <FlyoutBody>
        <EuiPanel>{'Content goes here'}</EuiPanel>
      </FlyoutBody>
    </>
  ) : (
    <FlyoutError />
  );
});

ThreatHuntingQueryPanel.displayName = 'ThreatHuntingQueryPanel';
