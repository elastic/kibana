/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiText,
  EuiButtonEmpty,
  useEuiFontSize,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { RoundedBadge } from '../styles';
import {
  useNodeDetailsPopover,
  type UseNodeDetailsPopoverReturn,
} from '../../popovers/details/use_node_details_popover';
import {
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_IPS_POPOVER_CONTENT_ID,
  GRAPH_IPS_POPOVER_IP_ID,
  GRAPH_IPS_POPOVER_IP_LINK_ID,
  GRAPH_IPS_POPOVER_ID,
  GRAPH_IPS_PLUS_COUNT_BUTTON_ID,
  GRAPH_IPS_BUTTON_ID,
  GRAPH_IPS_VALUE_ID,
} from '../../test_ids';
import { createPreviewItems } from '../utils';

export const VISIBLE_IPS_LIMIT = 1;

const popoverTipAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.ips.popoverAriaLabel',
  {
    defaultMessage: 'Show IP address details',
  }
);

const ipAddressLabel = i18n.translate('securitySolutionPackages.csp.graph.ips.ipAddressLabel', {
  defaultMessage: 'IP address: ',
});

export type UseIpPopoverReturn = UseNodeDetailsPopoverReturn & {
  onIpClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const useIpPopover = (
  ips: string[],
  scopeId?: string,
  onNetworkPreview?: (ip: string) => void
): UseIpPopoverReturn => {
  // When a direct network-preview callback is provided, create clickable button items
  // that invoke it — bypassing PreviewLink and its ExpandableFlyoutApi dependency.
  // Fall back to PreviewLink items (scopeId path) or plain label items.
  const items = useMemo(() => {
    if (onNetworkPreview) {
      return ips.map((ip, index) => ({
        key: `${index}-${ip}`,
        label: (
          <EuiLink
            key={`${index}-${ip}`}
            data-test-subj={GRAPH_IPS_POPOVER_IP_LINK_ID}
            onClick={() => onNetworkPreview(ip)}
          >
            {ip}
          </EuiLink>
        ),
      }));
    }
    return scopeId
      ? createPreviewItems('network-preview', ips, scopeId)
      : ips.map((ip, index) => ({
          key: `${index}-${ip}`,
          label: ip,
        }));
  }, [ips, scopeId, onNetworkPreview]);

  const { id, onClick, PopoverComponent, actions, state } = useNodeDetailsPopover({
    popoverId: 'ips-popover',
    items,
    contentTestSubj: GRAPH_IPS_POPOVER_CONTENT_ID,
    itemTestSubj: GRAPH_IPS_POPOVER_IP_ID,
    popoverTestSubj: GRAPH_IPS_POPOVER_ID,
  });

  const onIpClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => onClick(e), [onClick]);

  return {
    id,
    onIpClick,
    PopoverComponent,
    actions,
    state,
    onClick,
  };
};

export interface IpsProps {
  ips: string[];
  onIpClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const Ips = ({ ips, onIpClick }: IpsProps) => {
  const xsFontSize = useEuiFontSize('xs');
  const xxsFontSize = useEuiFontSize('xxs');

  if (ips.length === 0) return null;

  const isMultiple = ips.length > 1;

  // When there is only one IP, render its value (clickable or plain text).
  const ipValue = isMultiple ? null : onIpClick ? (
    <EuiButtonEmpty
      size="xs"
      color="text"
      data-test-subj={GRAPH_IPS_BUTTON_ID}
      onClick={onIpClick}
      aria-label={popoverTipAriaLabel}
      flush="both"
      css={css`
        font-weight: medium;
        ${xsFontSize};
      `}
    >
      {ips[0]}
    </EuiButtonEmpty>
  ) : (
    <EuiText
      data-test-subj={GRAPH_IPS_VALUE_ID}
      size="xs"
      color="subdued"
      css={css`
        font-weight: medium;
        ${xsFontSize};
      `}
    >
      {ips[0]}
    </EuiText>
  );

  // When there are multiple IPs, render a +N badge with the total count.
  const counter = isMultiple ? (
    <RoundedBadge data-test-subj={GRAPH_IPS_PLUS_COUNT_ID}>
      {onIpClick ? (
        <EuiButtonEmpty
          size="xs"
          color="text"
          data-test-subj={GRAPH_IPS_PLUS_COUNT_BUTTON_ID}
          onClick={onIpClick}
          aria-label={popoverTipAriaLabel}
          flush="both"
          css={css`
            font-weight: medium;
          `}
        >
          {`+${ips.length}`}
        </EuiButtonEmpty>
      ) : (
        <EuiText
          size="xs"
          color="subdued"
          aria-label={popoverTipAriaLabel}
          css={css`
            font-weight: medium;
            ${xsFontSize};
          `}
        >
          {`+${ips.length}`}
        </EuiText>
      )}
    </RoundedBadge>
  ) : null;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
      {isMultiple && (
        <EuiFlexItem grow={false}>
          <EuiText
            data-test-subj={GRAPH_IPS_TEXT_ID}
            size="xs"
            color="subdued"
            css={css`
              font-weight: medium;
              ${xxsFontSize};
            `}
          >
            {ipAddressLabel}
          </EuiText>
        </EuiFlexItem>
      )}
      {ipValue && <EuiFlexItem grow={false}>{ipValue}</EuiFlexItem>}
      {counter && <EuiFlexItem grow={false}>{counter}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};
