/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import * as i18n from '../translations';

export const DETONATION_LOADING_TEST_ID = 'detonationReportLoading';

/** How long the fake detonation takes before the report is shown. */
export const DETONATION_DURATION_MS = 4000;

/**
 * Detonation report flyout (prototype): shows a "Detonating" spinner for a few seconds, then
 * the report.
 */
export const DetonationReport: FC = memo(() => {
  const [isDetonating, setIsDetonating] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsDetonating(false), DETONATION_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (isDetonating) {
    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="xxs">
            <h3>{i18n.DETONATION_REPORT_TITLE.toUpperCase()}</h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            gutterSize="m"
            responsive={false}
            css={{ height: '100%' }}
            data-test-subj={DETONATION_LOADING_TEST_ID}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{`${i18n.DETONATING}…`}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" textAlign="center">
                {i18n.DETONATING_DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </>
    );
  }

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <Header />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer />
      </EuiFlyoutFooter>
    </>
  );
});

DetonationReport.displayName = 'DetonationReport';
