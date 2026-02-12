/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiProgress } from '@elastic/eui';
import React, { memo } from 'react';
import styled from 'styled-components';

import type { HeaderSectionProps } from '../../../../common/components/header_section';
import { HeaderSection } from '../../../../common/components/header_section';

interface StepPanelProps {
  children: React.ReactNode;
  loading: boolean;
  title?: string;
  headerProps?: Omit<HeaderSectionProps, 'title'>;
}

const MyPanel = styled(EuiPanel)`
  position: relative;
`;

MyPanel.displayName = 'MyPanel';

const StepPanelComponent: React.FC<StepPanelProps> = ({
  children,
  loading,
  title,
  headerProps,
}) => (
  <MyPanel hasBorder>
    {loading && (
      <EuiProgress
        size="xs"
        color="accent"
        position="absolute"
        data-test-subj="stepPanelProgress"
      />
    )}
    {title && <HeaderSection title={title} {...headerProps} />}
    {children}
  </MyPanel>
);

export const StepPanel = memo(StepPanelComponent);
