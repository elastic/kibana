/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCode, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import * as settingsI18n from '../settings_translations';

interface HuntIndexCoverageCalloutProps {
  coverage: HuntWorkerIndexCoverageResponse | undefined;
}

/**
 * Names the default data view patterns the Hunt worker's account cannot read, who the worker is,
 * and when that was observed. A warning, not a block: the worker still hunts what it can read.
 */
export const HuntIndexCoverageCallout = ({ coverage }: HuntIndexCoverageCalloutProps) => {
  if (
    !coverage ||
    coverage.source === 'unavailable' ||
    coverage.unreadable_by_worker.length === 0
  ) {
    return null;
  }
  const { account_label: account, checked_at: checkedAt, is_serverless: isServerless } = coverage;

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="warning"
        size="s"
        title={settingsI18n.HUNT_INDEX_COVERAGE_TITLE}
        data-test-subj="alertZeroHuntIndexCoverageCallout"
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.alertzero.watches.settings.huntIndexCoverage.patterns"
              defaultMessage="Patterns {account} cannot read:"
              values={{ account }}
            />{' '}
            {coverage.unreadable_by_worker.map((pattern) => (
              <React.Fragment key={pattern}>
                <EuiCode>{pattern}</EuiCode>{' '}
              </React.Fragment>
            ))}
          </p>
          <p>
            {coverage.source === 'last_sweep' && checkedAt ? (
              <FormattedMessage
                id="xpack.alertzero.watches.settings.huntIndexCoverage.observedBySweep"
                defaultMessage="Observed by the sweep {when}"
                values={{
                  when: (
                    <EuiToolTip
                      content={
                        <FormattedDate value={checkedAt} dateStyle="long" timeStyle="medium" />
                      }
                    >
                      <FormattedRelative value={checkedAt} />
                    </EuiToolTip>
                  ),
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.alertzero.watches.settings.huntIndexCoverage.basedOnRole"
                defaultMessage="Based on the {role} role"
                values={{ role: <EuiCode>{coverage.role_name}</EuiCode> }}
              />
            )}
          </p>
          <p>
            {isServerless
              ? settingsI18n.HUNT_INDEX_COVERAGE_GUIDANCE_SERVERLESS
              : settingsI18n.HUNT_INDEX_COVERAGE_GUIDANCE_STATEFUL}
          </p>
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
