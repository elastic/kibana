/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type ReactNode } from 'react';

import { EuiFlexItem, EuiTitle, EuiFlexGroup } from '@elastic/eui';
import { Popover } from '../tabs/common/popover';

export const SectionTitle = ({
  title,
  'data-test-subj': dataTestSubject,
}: {
  title: React.ReactNode;
  'data-test-subj'?: string;
}) => {
  return (
    <EuiTitle size="xxs" data-test-subj={dataTestSubject}>
      <span>{title}</span>
    </EuiTitle>
  );
};

export const TitleWithTooltip = ({
  title,
  'data-test-subj': dataTestSubject,
  tooltipTestSubj,
  tooltipContent,
}: {
  title: string;
  tooltipContent: ReactNode;
  'data-test-subj'?: string;
  tooltipTestSubj?: string;
}) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <SectionTitle title={title} data-test-subj={dataTestSubject} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Popover icon="iInCircle" data-test-subj={tooltipTestSubj}>
          {tooltipContent}
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
