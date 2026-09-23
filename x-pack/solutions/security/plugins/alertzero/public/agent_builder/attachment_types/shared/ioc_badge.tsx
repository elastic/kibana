/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenInDiscover',
  { defaultMessage: 'Open in Discover' }
);

export const OPEN_ENTITY_PAGE_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenEntityPage',
  { defaultMessage: 'Open entity page' }
);

export const OPEN_ALERT_DETAILS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenAlertDetails',
  { defaultMessage: 'Open alert details' }
);

const COPY_LABEL = i18n.translate('xpack.alertzero.agentBuilder.attachments.shared.iocBadgeCopy', {
  defaultMessage: 'Copy',
});

export interface IocBadgeAction {
  href: string;
  iconType: string;
  label: string;
}

export const discoverAction = (href: string | undefined): IocBadgeAction | undefined =>
  href ? { href, iconType: 'discoverApp', label: OPEN_IN_DISCOVER_LABEL } : undefined;

export interface IocBadgeProps {
  value: string;
  index?: number;
  action?: IocBadgeAction;
  testSubj?: string;
}

/**
 * Compact monospace value badge (IOC, id, hash) with hover/focus-revealed actions: copy, plus an
 * optional navigation action (Discover, entity page, alert details). Actions overlay the tail of
 * the badge so revealing them never shifts layout or escapes the card bounds, and long values
 * truncate with an ellipsis instead of stretching the row.
 */
export const IocBadge: React.FC<IocBadgeProps> = ({ value, index = 0, action, testSubj }) => {
  const { euiTheme } = useEuiTheme();
  const [isActive, setIsActive] = useState(false);

  const show = useCallback(() => setIsActive(true), []);
  const hide = useCallback(() => setIsActive(false), []);
  const hideIfLeaving = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsActive(false);
    }
  }, []);

  const wrapperStyles = css`
    position: relative;
    display: flex;
    max-width: 100%;
    min-width: 0;
    vertical-align: middle;

    &:focus-visible {
      outline: none;
    }
  `;

  const badgeStyles = css`
    max-width: 100%;
    min-width: 0;
    font-family: ${euiTheme.font.familyCode};
  `;

  const actionsStyles = css`
    position: absolute;
    top: 50%;
    right: 1px;
    transform: translateY(-50%);
    padding: 0 ${euiTheme.size.xxs} 0 ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
    box-shadow: -${euiTheme.size.s} 0 ${euiTheme.size.s} ${euiTheme.colors.backgroundBasePlain};
    z-index: ${euiTheme.levels.content};
  `;

  const openAction = useCallback(() => {
    if (action) {
      window.open(action.href, '_blank', 'noopener,noreferrer');
    }
  }, [action]);

  return (
    <span
      data-test-subj={testSubj}
      css={wrapperStyles}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hideIfLeaving}
    >
      <EuiBadge
        color="hollow"
        css={badgeStyles}
        title={value}
        data-test-subj={`alertzeroValueBadge-${index}`}
      >
        {value}
      </EuiBadge>
      {isActive && (
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false} css={actionsStyles}>
          {action && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={action.label} disableScreenReaderOutput>
                <EuiButtonIcon
                  size="xs"
                  color="text"
                  iconType={action.iconType}
                  aria-label={action.label}
                  onClick={openAction}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={value}>
              {(copy) => (
                <EuiToolTip content={COPY_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    color="text"
                    iconType="copy"
                    aria-label={COPY_LABEL}
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      copy();
                    }}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </span>
  );
};
