/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import styled from '@emotion/styled';
import {
  InfraWaffleMapBounds,
  InfraFormatter,
  InfraWaffleMapSteppedGradientLegend,
} from '../../../../../common/inventory/types';

interface Props {
  legend: InfraWaffleMapSteppedGradientLegend;
  bounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}
type TickValue = 0 | 1;
export const SteppedGradientLegend: React.FC<Props> = ({ legend, bounds, formatter }) => {
  return (
    <LegendContainer>
      <TickLabel value={1} bounds={bounds} formatter={formatter} />
      <GradientContainer>
        {legend.rules
          .slice()
          .reverse()
          .map((rule, index) => (
            <GradientStep
              key={`step-${index}-${rule.value}`}
              style={{ backgroundColor: rule.color }}
            />
          ))}
      </GradientContainer>
      <TickLabel value={0} bounds={bounds} formatter={formatter} />
    </LegendContainer>
  );
};

interface TickProps {
  bounds: InfraWaffleMapBounds;
  value: TickValue;
  formatter: InfraFormatter;
}

const TickLabel = ({ value, bounds, formatter }: TickProps) => {
  const normalizedValue = value === 0 ? bounds.min : bounds.max * value;
  const label = formatter(normalizedValue);
  return (
    <div>
      <EuiText size="xs">{label}</EuiText>
    </div>
  );
};

const LegendContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const GradientContainer = styled.div`
  height: 200px;
  width: 10px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const GradientStep = styled.div`
  flex: 1 1 auto;
  &:first-child {
    border-radius: ${(props) => props.theme.euiTheme.border.radius}
      ${(props) => props.theme.euiTheme.border.radius} 0 0;
  }
  &:last-child {
    border-radius: 0 0 ${(props) => props.theme.euiTheme.border.radius}
      ${(props) => props.theme.euiTheme.border.radius};
  }
`;
