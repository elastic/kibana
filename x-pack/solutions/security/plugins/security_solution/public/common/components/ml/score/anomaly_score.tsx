/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiDescriptionList, EuiFlexItem, EuiIcon } from '@elastic/eui';
import styled from 'styled-components';
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

const Icon = styled(EuiIcon)`
  vertical-align: text-bottom;
  cursor: pointer;
`;

Icon.displayName = 'Icon';

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
  return (
    <>
      <EuiFlexItem grow={false} data-test-subj="anomaly-score">
        <Score index={index} score={score} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          data-test-subj="anomaly-score-popover"
          id="anomaly-score-popover"
          isOpen={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          closePopover={() => setIsOpen(!isOpen)}
          button={<Icon type="iInCircle" />}
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
