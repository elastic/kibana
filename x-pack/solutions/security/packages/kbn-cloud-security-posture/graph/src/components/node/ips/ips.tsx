/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiText, EuiButtonEmpty, useEuiFontSize, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import {
  useNodeDetailsPopover,
  type UseNodeDetailsPopoverReturn,
} from '../../popovers/details/use_node_details_popover';
import {
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_IPS_POPOVER_CONTENT_ID,
  GRAPH_IPS_POPOVER_IP_ID,
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

export type UseIpPopoverReturn = UseNodeDetailsPopoverReturn & {
  onIpClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const useIpPopover = (ips: string[], scopeId?: string): UseIpPopoverReturn => {
  const items = scopeId
    ? createPreviewItems('network-preview', ips, scopeId)
    : ips.map((ip, index) => ({
        key: `${index}-${ip}`,
        label: ip,
      }));

  const { id, onClick, PopoverComponent, actions, state } = useNodeDetailsPopover({
    popoverId: 'ips-popover',
    items,
    contentTestSubj: GRAPH_IPS_POPOVER_CONTENT_ID,
    itemTestSubj: GRAPH_IPS_POPOVER_IP_ID,
    popoverTestSubj: GRAPH_IPS_POPOVER_ID,
  });

  return {
    id,
    onIpClick: onClick,
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
  const sFontSize = useEuiFontSize('s');
  const xsFontSize = useEuiFontSize('xs');

  if (ips.length === 0) return null;

  const visibleIps = (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiText
          data-test-subj={GRAPH_IPS_TEXT_ID}
          size="s"
          color="subdued"
          css={css`
            font-weight: medium;
            ${sFontSize};
          `}
        >
          {'IP: '}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {ips.length === 1 && onIpClick ? (
          <EuiButtonEmpty
            size="s"
            color="text"
            data-test-subj={GRAPH_IPS_BUTTON_ID}
            onClick={onIpClick}
            aria-label={popoverTipAriaLabel}
            flush="both"
            css={css`
              font-weight: medium;
              ${sFontSize};
            `}
          >
            {ips[0]}
          </EuiButtonEmpty>
        ) : (
          <EuiText
            data-test-subj={GRAPH_IPS_VALUE_ID}
            size="s"
            color="subdued"
            css={css`
              font-weight: medium;
              ${sFontSize};
            `}
          >
            {ips.slice(0, VISIBLE_IPS_LIMIT).join(', ')}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const counter =
    ips.length > VISIBLE_IPS_LIMIT ? (
      onIpClick ? (
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
          {`+${ips.length - VISIBLE_IPS_LIMIT}`}
        </EuiButtonEmpty>
      ) : (
        <EuiText
          size="xs"
          color="subdued"
          aria-label={popoverTipAriaLabel}
          data-test-subj={GRAPH_IPS_PLUS_COUNT_ID}
          css={css`
            font-weight: medium;
            ${xsFontSize};
          `}
        >
          {`+${ips.length - VISIBLE_IPS_LIMIT}`}
        </EuiText>
      )
    ) : null;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
      <EuiFlexItem grow={false}>{visibleIps}</EuiFlexItem>
      {counter && <EuiFlexItem grow={false}>{counter}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};
