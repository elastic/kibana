/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiRangeProps } from '@elastic/eui';
import {
  EuiRange,
  EuiButtonIcon,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import styled from 'styled-components';

export const COLUMN_WIDTH = ['fit-content(10em)', 'auto'];

// EuiRange is currently only horizontally positioned. This reorients the track to a vertical position
export const StyledEuiRange = styled(EuiRange)<EuiRangeProps>`
  & .euiRangeTrack:after {
    left: -65px;
    transform: rotate(90deg);
  }
`;
export interface StyledGraphControlProps {
  $backgroundColor: string;
  $iconColor: string;
  $borderColor: string;
}

export const StyledGraphControlsColumn = styled.div`
  display: flex;
  flex-direction: column;

  &:not(last-of-type) {
    margin-right: 5px;
  }
`;

export const StyledEuiDescriptionListTitle = styled(EuiDescriptionListTitle)`
  text-transform: uppercase;
`;

export const StyledEuiDescriptionListDescription = styled(EuiDescriptionListDescription)`
  lineheight: '2.2em'; // lineHeight to align center vertically
`;

export const StyledEuiButtonIcon = styled(EuiButtonIcon)<StyledGraphControlProps>`
  background-color: ${(props) => props.$backgroundColor};
  color: ${(props) => props.$iconColor};
  border-color: ${(props) => props.$borderColor};
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  width: 40px;
  height: 40px;

  &:not(last-of-type) {
    margin-bottom: 7px;
  }
`;

export const StyledGraphControls = styled.div<Partial<StyledGraphControlProps>>`
  display: flex;
  flex-direction: row;
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: transparent;
  color: ${(props) => props.$iconColor};

  .zoom-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 0px;

    .zoom-slider {
      width: 20px;
      height: 150px;
      margin: 5px 0px 2px 0px;

      input[type='range'] {
        width: 150px;
        height: 20px;
        transform-origin: 75px 75px;
        transform: rotate(-90deg);
      }
    }
  }
  .panning-controls {
    text-align: center;
  }
`;
