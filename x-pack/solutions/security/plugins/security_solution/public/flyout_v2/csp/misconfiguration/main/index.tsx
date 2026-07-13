/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { createMisconfigurationFindingsQuery } from '@kbn/cloud-security-posture-common/utils/findings_query_builders';
import { FlyoutError } from '../../../shared/components/flyout_error';
import { FlyoutLoading } from '../../../shared/components/flyout_loading';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { MISCONFIGURATION_PANEL_LOADING_TEST_ID } from './test_ids';

export interface MisconfigurationProps {
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
 * V2 system-flyout compatible misconfiguration finding panel.
 * This is a simplified version that doesn't use expandable flyout components.
 */
export const Misconfiguration: FC<MisconfigurationProps> = memo(({ resourceId, ruleId }) => {
  const { data, isLoading, isError } = useMisconfigurationFinding({
    query: createMisconfigurationFindingsQuery(resourceId, ruleId),
    enabled: true,
    pageSize: 1,
  });

  const finding = data?.result.hits[0]?._source;

  if (isLoading) {
    return <FlyoutLoading data-test-subj={MISCONFIGURATION_PANEL_LOADING_TEST_ID} />;
  }

  if (isError || !finding) {
    return <FlyoutError />;
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header finding={finding} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content finding={finding} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer resourceId={resourceId} ruleId={ruleId} />
      </EuiFlyoutFooter>
    </>
  );
});

Misconfiguration.displayName = 'Misconfiguration';
