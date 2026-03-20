/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../../timelines/components/timeline/helpers';

interface ProviderContainerProps {
  isDragging: boolean;
}

const getProviderContainerStyles = ({
  euiTheme,
  isDragging,
}: {
  euiTheme: UseEuiTheme['euiTheme'];
  isDragging: boolean;
}) => css`
  ${!isDragging
    ? css`
        & {
          border-radius: 2px;
          padding: 0 4px 0 8px;
          position: relative;
          z-index: ${euiTheme.levels.content} !important;

          &::before {
            background-image: linear-gradient(
                135deg,
                ${euiTheme.colors.mediumShade} 25%,
                transparent 25%
              ),
              linear-gradient(-135deg, ${euiTheme.colors.mediumShade} 25%, transparent 25%),
              linear-gradient(135deg, transparent 75%, ${euiTheme.colors.mediumShade} 75%),
              linear-gradient(-135deg, transparent 75%, ${euiTheme.colors.mediumShade} 75%);
            background-position: 0 0, 1px 0, 1px -1px, 0px 1px;
            background-size: 2px 2px;
            bottom: 2px;
            content: '';
            display: block;
            left: 2px;
            position: absolute;
            top: 2px;
            width: 4px;
          }
        }

        &:hover {
          &,
          & .euiBadge,
          & .euiBadge__text {
            cursor: move; /* Fallback for IE11 */
            cursor: grab;
          }
        }

        .${STATEFUL_EVENT_CSS_CLASS_NAME}:hover &,
        tr:hover & {
          &::before {
            background-image: linear-gradient(
                135deg,
                ${euiTheme.colors.darkShade} 25%,
                transparent 25%
              ),
              linear-gradient(-135deg, ${euiTheme.colors.darkShade} 25%, transparent 25%),
              linear-gradient(135deg, transparent 75%, ${euiTheme.colors.darkShade} 75%),
              linear-gradient(-135deg, transparent 75%, ${euiTheme.colors.darkShade} 75%);
          }
        }

        &:hover,
        &:focus,
        .${STATEFUL_EVENT_CSS_CLASS_NAME}:hover &:hover,
        .${STATEFUL_EVENT_CSS_CLASS_NAME}:focus &:focus,
        tr:hover &:hover,
        tr:hover &:focus {
          background-color: ${euiTheme.colors.primary};

          &,
          & a,
          & a:hover {
            color: ${euiTheme.colors.emptyShade};
          }

          &::before {
            background-image: linear-gradient(
                135deg,
                ${euiTheme.colors.emptyShade} 25%,
                transparent 25%
              ),
              linear-gradient(-135deg, ${euiTheme.colors.emptyShade} 25%, transparent 25%),
              linear-gradient(135deg, transparent 75%, ${euiTheme.colors.emptyShade} 75%),
              linear-gradient(-135deg, transparent 75%, ${euiTheme.colors.emptyShade} 75%);
          }
        }
      `
    : css`
        & {
          z-index: ${euiTheme.levels.toast} !important;
        }
      `}
`;

const ProviderContainerComponent: React.FC<
  React.HTMLAttributes<HTMLDivElement> & ProviderContainerProps
> = ({ isDragging, children, ...props }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div css={getProviderContainerStyles({ euiTheme, isDragging })} {...props}>
      {children}
    </div>
  );
};

ProviderContainerComponent.displayName = 'ProviderContainerComponent';

export const ProviderContainer = React.memo(ProviderContainerComponent);

ProviderContainer.displayName = 'ProviderContainer';
