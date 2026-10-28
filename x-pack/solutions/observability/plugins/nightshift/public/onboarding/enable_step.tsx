/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiIcon, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { useEnableNightshift } from './use_onboarding';

/**
 * The first onboarding step: a one-time setup of the space that installs the Nightshift
 * investigation agent there. Admins (Nightshift manage) enable it; everyone else is asked to
 * find one.
 */
export function OnboardingEnableStep(): React.ReactElement {
  const { application } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const enable = useEnableNightshift();

  return (
    <EuiPanel hasBorder paddingSize="xl" data-test-subj="nightshiftOnboardingEnableStep">
      <EuiEmptyPrompt
        color="transparent"
        paddingSize="none"
        icon={<EuiIcon type="logoElastic" size="xxl" aria-hidden={true} />}
        title={
          <h2>
            {i18n.translate('xpack.nightshift.onboarding.enable.title', {
              defaultMessage: 'One-time setup required for this space',
            })}
          </h2>
        }
        body={
          <p>
            {canManage
              ? i18n.translate('xpack.nightshift.onboarding.enable.adminDescription', {
                  defaultMessage:
                    'Enabling Elastic Nightshift installs its investigation agent in this space. The agent investigates on behalf of the users of this space, and you manage what it can reach in Agent Builder.',
                })
              : i18n.translate('xpack.nightshift.onboarding.enable.userDescription', {
                  defaultMessage:
                    'A Nightshift administrator has to enable Elastic Nightshift once for this space. Ask them to turn it on.',
                })}
          </p>
        }
        actions={
          <EuiButton
            fill
            size="s"
            iconType={canManage ? undefined : 'lock'}
            isDisabled={!canManage}
            isLoading={enable.isLoading}
            onClick={() => enable.mutate()}
            data-test-subj="nightshiftOnboardingEnableButton"
          >
            {i18n.translate('xpack.nightshift.onboarding.enable.button', {
              defaultMessage: 'Enable Elastic Nightshift',
            })}
          </EuiButton>
        }
      />
    </EuiPanel>
  );
}
