/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiSpacer, EuiText } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { HuntAvailability } from '../../../common/hunt_library';
import { formatAvailabilityDetail } from './format_availability_detail';
import { HuntAvailabilityBadge } from './hunt_availability_badge';
import * as i18n from './translations';

interface HuntAvailabilityPanelProps {
  title: string;
  availability: HuntAvailability;
  note?: string;
  'data-test-subj': string;
}

/** One identity's availability in the flyout, listing every failing check, not only the first. */
export const HuntAvailabilityPanel: React.FC<HuntAvailabilityPanelProps> = ({
  title,
  availability,
  note,
  'data-test-subj': dataTestSubj,
}) => (
  <div data-test-subj={dataTestSubj}>
    <EuiText size="s">
      <strong>{title}</strong>{' '}
      <HuntAvailabilityBadge availability={availability} data-test-subj={`${dataTestSubj}Badge`} />
    </EuiText>
    {note ? (
      <EuiText size="xs" color="subdued">
        {note}
      </EuiText>
    ) : null}
    {availability.failures.map(({ reason, details }) => (
      <React.Fragment key={reason}>
        <EuiSpacer size="s" />
        <KbnWarningCallout
          size="s"
          title={i18n.REASON_EXPLANATIONS[reason]}
          data-test-subj={`${dataTestSubj}-${reason}`}
        >
          <ul>
            {details.map((detail) => (
              <li key={detail}>
                {reason === 'unavailable_mapping' ? (
                  formatAvailabilityDetail({ reason, detail })
                ) : (
                  <EuiCode>{formatAvailabilityDetail({ reason, detail })}</EuiCode>
                )}
              </li>
            ))}
          </ul>
        </KbnWarningCallout>
      </React.Fragment>
    ))}
  </div>
);
