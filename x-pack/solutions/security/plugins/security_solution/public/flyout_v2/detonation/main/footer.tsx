/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from '../translations';

export const DETONATION_FOOTER_TEST_ID = 'detonationReportFooter';

/**
 * Footer of the detonation report flyout.
 */
export const Footer = memo(() => (
  <EuiFlexGroup
    justifyContent="spaceBetween"
    alignItems="center"
    responsive={false}
    data-test-subj={DETONATION_FOOTER_TEST_ID}
  >
    <EuiFlexItem grow={false}>
      <EuiCopy textToCopy={window.location.href}>
        {(copy) => (
          <EuiButton onClick={copy} data-test-subj="detonationReportCopyPermalink">
            {i18n.COPY_PERMALINK}
          </EuiButton>
        )}
      </EuiCopy>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton fill data-test-subj="detonationReportOpenFull">
        {i18n.OPEN_FULL_REPORT}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
));

Footer.displayName = 'Footer';
