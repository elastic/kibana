/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import {
  EuiBadge,
  EuiText,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiCopy,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';

const copyItem = i18n.translate('securitySolutionPackages.csp.actionableBadge.copy', {
  defaultMessage: 'Copy',
});

export interface MultiValueCellAction {
  iconType: string;
  onClick?: () => void;
  ariaLabel: string;
  title?: string;
}

interface ActionableBadgeProps {
  item: string;
  index: number;
  actions?: MultiValueCellAction[];
}

export const ActionableBadge = ({ item, index, actions = [] }: ActionableBadgeProps) => {
  const [showActions, setShowActions] = useState(false);
  const { euiTheme } = useEuiTheme();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const iconsContainerRef = useRef<HTMLDivElement | null>(null);

  const [buttonPosition, setButtonPosition] = useState({ bottom: 0, left: 0 });

  const updatePosition = () => {
    if (buttonRef.current && iconsContainerRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const myElement = iconsContainerRef.current.getBoundingClientRect();

      setButtonPosition({
        bottom: window.innerHeight - rect.top, // offset from the top of the badge
        left: rect.right - myElement.width, // align with right edge
      });
    }
  };

  const buttonIconCss = css`
    color: ${euiTheme.colors.plainLight};
    inline-size: ${euiTheme.base}px;
    block-size: ${euiTheme.base}px;
    svg {
      width: ${euiTheme.size.m};
      height: ${euiTheme.size.m};
  `;

  React.useEffect(() => {
    if (showActions) {
      updatePosition();
    }
  }, [showActions]);

  const handleMouseLeave = () => {
    setShowActions(false);
  };

  const handleMouseEnter = () => {
    setShowActions(true);
  };

  const actionButtons = createPortal(
    <EuiFlexGroup
      ref={iconsContainerRef}
      gutterSize="xs"
      alignItems="flexEnd"
      onMouseEnter={handleMouseEnter}
      responsive={false}
      onMouseLeave={handleMouseLeave}
      css={css`
        position: fixed;
        z-index: ${euiTheme.levels.modal};
        background-color: ${euiTheme.colors.primary};
        border-radius: ${euiTheme.size.xs};
        padding: ${euiTheme.size.xxs};
      `}
      style={{
        bottom: buttonPosition.bottom,
        left: buttonPosition.left,
      }}
    >
      {actions.map((action, actionIndex) => (
        <EuiFlexItem grow={false} key={`${action.iconType}-${actionIndex}`}>
          <EuiButtonIcon
            css={buttonIconCss}
            onClick={action.onClick}
            iconType={action.iconType}
            aria-label={action.ariaLabel}
            title={action.title}
          />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={item}>
          {(copy) => (
            <EuiButtonIcon
              onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                event.stopPropagation();
                copy();
              }}
              iconType="copy"
              css={buttonIconCss}
              aria-label={copyItem}
              title={copyItem}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>,
    document.body
  );

  return (
    <div
      ref={buttonRef}
      css={css`
        position: relative;
        display: inline-block;
      `}
    >
      {showActions && actionButtons}
      <EuiBadge
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        color="hollow"
        key={`${item}-${index}`}
        data-test-subj={`multi-value-copy-badge-${index}`}
      >
        <EuiText
          css={css`
            text-overflow: ellipsis;
          `}
          size="m"
        >
          {item}
        </EuiText>
      </EuiBadge>
    </div>
  );
};
