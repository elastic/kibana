/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import { NightshiftIllustration } from './nightshift_illustration';

interface NightshiftWelcomeProps {
  /**
   * Called when the user clicks "Enable Nightshift". The parent should
   * transition the Nightshift page into its "analyzing" view (this
   * component intentionally doesn't navigate or fade itself away).
   */
  onEnable: () => void;
  /**
   * Whether the welcome state is being faded out (because the parent has
   * triggered a transition). When true the button is disabled and the
   * page becomes inert.
   */
  isExiting?: boolean;
}

/**
 * Centered welcome state for the Nightshift page — illustration, title,
 * body copy, and the "Enable Nightshift" CTA. Fades + lifts out when the
 * parent passes `isExiting`.
 */
export const NightshiftWelcome: React.FC<NightshiftWelcomeProps> = ({ onEnable, isExiting }) => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: calc(var(--kbn-application--content-height, 100vh) - 96px);
        opacity: ${isExiting ? 0 : 1};
        transform: ${isExiting ? 'translateY(-6px)' : 'translateY(0)'};
        transition: opacity 225ms ease-out, transform 225ms ease-out;
        pointer-events: ${isExiting ? 'none' : 'auto'};

        @media (prefers-reduced-motion: reduce) {
          transition: opacity 225ms linear;
          transform: none;
        }
      `}
      aria-hidden={isExiting ? 'true' : undefined}
    >
      <EuiEmptyPrompt
        data-test-subj="nightshiftWelcomeEmptyState"
        icon={<NightshiftIllustration />}
        title={
          <h2>
            {i18n.translate('xpack.observability.nightshift.welcomeTitle', {
              defaultMessage: 'Welcome to Nightshift',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.observability.nightshift.welcomeBody', {
              defaultMessage:
                'Autonomous mode \u2014 Kibana runs your observability while you sleep. This experience is still being built.',
            })}
          </p>
        }
        actions={[
          <AiButton
            variant="base"
            data-test-subj="enableNightshiftButton"
            isDisabled={isExiting}
            onClick={onEnable}
          >
            {i18n.translate('xpack.observability.nightshift.enableButtonLabel', {
              defaultMessage: 'Enable Nightshift',
            })}
          </AiButton>,
        ]}
      />
    </div>
  );
};
