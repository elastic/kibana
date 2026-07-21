/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OnboardingPill } from '../types';

interface OnboardingPillsProps {
  pills: OnboardingPill[];
  telemetryPrefix: string;
}

export const OnboardingPills = ({ pills, telemetryPrefix }: OnboardingPillsProps) => {
  const { euiTheme } = useEuiTheme();
  const [openPillId, setOpenPillId] = useState<string | null>(null);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} wrap data-test-subj="vectordbWizardPills">
      {pills.map((pill) => (
        <EuiFlexItem grow={false} key={pill.id}>
          <EuiPopover
            button={
              <EuiBadge
                iconType="plus"
                iconSide="left"
                onClick={() => setOpenPillId((current) => (current === pill.id ? null : pill.id))}
                onClickAriaLabel={i18n.translate(
                  'vectordbOnboarding.wizard.pills.toggleAriaLabel',
                  {
                    defaultMessage: 'Show more about {label}',
                    values: { label: pill.label },
                  }
                )}
                data-test-subj={`vectordbWizardPill-${pill.id}`}
                data-telemetry-id={`${telemetryPrefix}-pill-${pill.id}`}
              >
                {pill.label}
              </EuiBadge>
            }
            isOpen={openPillId === pill.id}
            closePopover={() => setOpenPillId(null)}
            anchorPosition="downLeft"
            panelPaddingSize="m"
            panelStyle={{ maxWidth: euiTheme.base * 22.5 }}
            aria-label={pill.label}
          >
            <EuiText size="s">{pill.content}</EuiText>
          </EuiPopover>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
