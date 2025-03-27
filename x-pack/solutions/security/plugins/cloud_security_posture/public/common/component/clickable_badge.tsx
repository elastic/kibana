/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import {
  EuiBadge,
  EuiToolTip,
  EuiText,
  copyToClipboard,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';
import { css } from '@emotion/react';
import { createPortal } from 'react-dom';

interface ClickableBadgeProps {
  item: string;
  onClickAriaLabel?: string;
  onClick?: () => void;
  index: number;
}

export const ClickableBadge = ({ item, onClickAriaLabel, onClick, index }: ClickableBadgeProps) => {
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const copiedTextToolTipCleanupIdRef = useRef<ReturnType<typeof setTimeout>>();
  const { euiTheme } = useEuiTheme();
  const buttonRef = useRef<HTMLDivElement>(null);
  const iconsContainerRef = useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    if (showActions) {
      updatePosition();
    }
  }, [showActions]);

  const onCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(item);

    if (copiedTextToolTipCleanupIdRef.current) {
      clearTimeout(copiedTextToolTipCleanupIdRef.current);
    }

    setIsTextCopied(true);
    copiedTextToolTipCleanupIdRef.current = setTimeout(() => setIsTextCopied(false), 2000);
  };

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
      alignItems="center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      css={css`
        position: fixed;
        z-index: 9000;
        background-color: ${euiTheme.colors.primary};
        border-radius: 4px;
        padding: 2px;
      `}
      style={{
        bottom: buttonPosition.bottom,
        left: buttonPosition.left,
      }}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          css={css`
            color: ${euiTheme.colors.vis.euiColorVisCool0};
          `}
          size="xs"
          onClick={onClick}
          iconType="plusInCircle"
          aria-label={i18n.translate('xpack.csp.addFilter', { defaultMessage: 'Add filter' })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          css={css`
            color: ${euiTheme.colors.vis.euiColorVisCool0};
          `}
          size="xs"
          iconType="minusInCircle"
          aria-label={i18n.translate('xpack.csp.removeFilter', { defaultMessage: 'Remove filter' })}
          onClick={() => {}}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            isTextCopied
              ? i18n.translate('xpack.csp.itemCopied', { defaultMessage: 'Item copied' })
              : null
          }
        >
          <EuiButtonIcon
            css={css`
              color: ${euiTheme.colors.vis.euiColorVisCool0};
            `}
            size="xs"
            onClick={onCopyClick}
            iconType="copy"
            aria-label="Copy to clipboard"
          />
        </EuiToolTip>
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
        key={`${item}-${v4()}`}
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
