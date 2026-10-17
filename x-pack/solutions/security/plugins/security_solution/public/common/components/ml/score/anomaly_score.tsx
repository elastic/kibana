/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiDescriptionList,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NarrowDateRange, Anomaly } from '../types';
import { Score } from './score';
import { createDescriptionList } from './create_description_list';

interface Args {
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
  index?: number;
  score: Anomaly;
  interval: string;
  jobName: string;
}

export const AnomalyScoreComponent = ({
  startDate,
  endDate,
  index = 0,
  score,
  interval,
  narrowDateRange,
  jobName,
}: Args): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonAriaLabel = i18n.translate(
    'xpack.securitySolution.anomalyScore.popoverButton.ariaLabel',
    {
      defaultMessage: 'View anomaly score details for {jobName}',
      values: { jobName },
    }
  );
  return (
    <>
      <EuiFlexItem grow={false} data-test-subj="anomaly-score">
        <Score index={index} score={score} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.translate('xpack.securitySolution.anomalyScore.popover.ariaLabel', {
            defaultMessage: 'Anomaly score details',
          })}
          data-test-subj="anomaly-score-popover"
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          button={
            <EuiToolTip content={buttonAriaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj="anomaly-score-popover-button"
                iconType="info"
                color="text"
                size="xs"
                aria-label={buttonAriaLabel}
                onClick={() => setIsOpen((prevIsOpen) => !prevIsOpen)}
              />
            </EuiToolTip>
          }
          repositionOnScroll
        >
          <EuiDescriptionList
            data-test-subj="anomaly-description-list"
            listItems={createDescriptionList(
              score,
              startDate,
              endDate,
              interval,
              narrowDateRange,
              jobName
            )}
          />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
};

AnomalyScoreComponent.displayName = 'AnomalyScoreComponent';

export const AnomalyScore = React.memo(AnomalyScoreComponent);

AnomalyScore.displayName = 'AnomalyScore';
