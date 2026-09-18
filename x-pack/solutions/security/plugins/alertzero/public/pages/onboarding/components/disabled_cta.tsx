/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiEmptyPrompt, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { AlertZeroPageSection } from '../../../components/layout/alertzero_page_section';
import * as i18n from '../translations';

export interface DisabledCtaProps {
  /** Whether the `alertzero:enabled` advanced setting is currently `true`. */
  enabled: boolean;
  /** Derived from `capabilities.advancedSettings.save`; when `false` the toggle is locked. */
  canToggle: boolean;
  isEnabling: boolean;
  isError: boolean;
  onEnable: () => void;
}

/**
 * S0 — the disabled CTA. The only way forward is flipping the source-of-truth advanced setting via
 * the enable route, so the toggle is the single interactive element and it is gated on the
 * `advancedSettings.save` capability.
 */
export const DisabledCta: React.FC<DisabledCtaProps> = ({
  enabled,
  canToggle,
  isEnabling,
  isError,
  onEnable,
}) => (
  <AlertZeroPageSection>
    <EuiEmptyPrompt
      data-test-subj="alertZeroOnboardingDisabledPage"
      iconType="lock"
      title={<h2>{i18n.DISABLED_TITLE}</h2>}
      body={
        <>
          <p>{i18n.DISABLED_BODY}</p>
          <EuiSpacer size="m" />
          <EuiSwitch
            data-test-subj="alertZeroOnboardingEnableToggle"
            label={i18n.ENABLE_TOGGLE_LABEL}
            checked={enabled}
            disabled={!canToggle || isEnabling}
            onChange={onEnable}
          />
          {!canToggle ? (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                data-test-subj="alertZeroOnboardingEnablePermissionDenied"
                title={i18n.ENABLE_PERMISSION_DENIED}
                color="warning"
                iconType="lock"
                size="s"
              />
            </>
          ) : (
            <EuiSpacer size="m" />
          )}
          {isError ? (
            <EuiCallOut
              announceOnMount
              data-test-subj="alertZeroOnboardingEnableError"
              title={i18n.ENABLE_ERROR}
              color="danger"
              iconType="error"
              size="s"
            />
          ) : null}
        </>
      }
    />
  </AlertZeroPageSection>
);
