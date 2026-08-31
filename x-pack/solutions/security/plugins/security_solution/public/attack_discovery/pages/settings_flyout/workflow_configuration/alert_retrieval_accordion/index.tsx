/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer, EuiSwitch } from '@elastic/eui';
import type { EuiSwitchEvent } from '@elastic/eui';

import type { DefaultAlertRetrievalAccordionProps } from '../types';
import * as i18n from '../translations';

const DefaultAlertRetrievalAccordionComponent: React.FC<DefaultAlertRetrievalAccordionProps> = ({
  children,
  isEnabled,
  onToggle,
}) => {
  const handleToggle = useCallback(
    (e: EuiSwitchEvent) => {
      onToggle(e.target.checked);
    },
    [onToggle]
  );

  return (
    <div data-test-subj="defaultAlertRetrievalAccordion">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            checked={isEnabled}
            compressed
            data-test-subj="defaultAlertRetrievalToggle"
            label={i18n.DEFAULT_ALERT_RETRIEVAL_TOGGLE_LABEL}
            onChange={handleToggle}
          />
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="defaultAlertRetrievalTooltip" grow={false}>
          <EuiIconTip content={i18n.DEFAULT_ALERT_RETRIEVAL_TOOLTIP} position="right" type="info" />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isEnabled && (
        <>
          <EuiSpacer size="m" />
          <div data-test-subj="defaultAlertRetrievalContent">{children}</div>
        </>
      )}
    </div>
  );
};

DefaultAlertRetrievalAccordionComponent.displayName = 'DefaultAlertRetrievalAccordion';

export const DefaultAlertRetrievalAccordion = React.memo(DefaultAlertRetrievalAccordionComponent);
DefaultAlertRetrievalAccordion.displayName = 'DefaultAlertRetrievalAccordion';
