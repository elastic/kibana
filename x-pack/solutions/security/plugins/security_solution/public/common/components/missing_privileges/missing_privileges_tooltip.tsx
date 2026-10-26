/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

const anchorProps = {
  style: { width: 'fit-content' },
  'data-test-subj': 'missingPrivilegesTooltipAnchor',
};

interface MissingPrivilegesTooltip {
  /**
   * EuiToolTip requires a single ReactElement child
   */
  children: React.ReactElement;
  /**
   * Description to display in the tooltip
   */
  description: React.ReactNode;
}

/**
 * Show a tooltip with the missint privileges description
 */
export const MissingPrivilegesTooltip = React.memo<MissingPrivilegesTooltip>(
  ({ children, description }) => (
    <EuiToolTip
      data-test-subj="missingPrivilegesTooltip"
      anchorProps={anchorProps}
      title={i18n.PRIVILEGES_MISSING_TITLE}
      content={description}
    >
      {children}
    </EuiToolTip>
  )
);
MissingPrivilegesTooltip.displayName = 'MissingPrivilegesTooltip';
