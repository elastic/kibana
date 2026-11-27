/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useKibana } from '../../../common/lib/kibana';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { useIsDetonationJobDone } from '../detonation_jobs';
import * as i18n from '../translations';

export const DETONATION_LOADING_TEST_ID = 'detonationReportLoading';

/**
 * Detonation report flyout (prototype): shows a "Detonating" spinner until the detonation job
 * is done, then the report.
 */
export interface DetonationReportProps {
  /** Show the existing report straight away, without the "Detonating" step. */
  skipDetonation?: boolean;
  /** Id of the running detonation job; the report is shown once it is done. */
  jobId?: string;
}

export const DetonationReport: FC<DetonationReportProps> = memo(
  ({ skipDetonation = false, jobId }) => {
    const isJobDone = useIsDetonationJobDone(skipDetonation ? undefined : jobId);
    const isDetonating = !isJobDone;
    const { application } = useKibana().services;

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
                  {i18n.DETONATING_SANDBOX}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ alignSelf: 'stretch' }}>
                <KbnInfoCallout
                  size="s"
                  title={
                    <>
                      <div>{i18n.DETONATING_DURATION}</div>
                      <div css={{ fontWeight: 'normal' }}>{i18n.DETONATING_NOTIFY}</div>
                    </>
                  }
                  data-test-subj="detonationLoadingCallout"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ alignSelf: 'stretch' }}>
                <EuiButton
                  fullWidth
                  color="primary"
                  onClick={() =>
                    application.navigateToApp(APP_UI_ID, {
                      deepLinkId: SecurityPageName.detonate,
                    })
                  }
                  data-test-subj="detonationSeeDetonations"
                >
                  {i18n.SEE_DETONATIONS}
                </EuiButton>
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
  }
);

DetonationReport.displayName = 'DetonationReport';
