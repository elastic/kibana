/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiText, EuiButtonEmpty, useEuiFontSize, EuiListGroup } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { PopoverActions, PopoverState } from '../../graph/use_graph_popover';
import { useGraphPopover } from '../../graph/use_graph_popover';
import { GraphPopover } from '../../graph/graph_popover';
import { ExpandPopoverListItem } from '../../styles';
import {
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_IPS_POPOVER_CONTENT_ID,
  GRAPH_IPS_POPOVER_IP_ID,
  GRAPH_IPS_POPOVER_ID,
} from '../../test_ids';

export const VISIBLE_IPS_LIMIT = 1;
export const MAX_IPS_IN_POPOVER = 10;

const toolTipAriaLabel = i18n.translate('securitySolutionPackages.csp.graph.ips.toolTipAriaLabel', {
  defaultMessage: 'Show IP address details',
});

export interface UseIpPopoverReturn {
  /**
   * The ID of the popover.
   */
  id: string;

  /**
   * Handler to open the popover when the IP button is clicked.
   */
  onIpClick: (e: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * The component that renders the popover.
   */
  PopoverComponent: React.FC;

  /**
   * The popover actions and state.
   */
  actions: PopoverActions;

  /**
   * The popover state.
   */
  state: PopoverState;
}

export const useIpPopover = (ips: string[]): UseIpPopoverReturn => {
  const { id, state, actions } = useGraphPopover('ips-popover');

  const popoverContent = useMemo(
    () => (
      <EuiListGroup
        gutterSize="none"
        bordered={false}
        size="m"
        flush={true}
        color="primary"
        data-test-subj={GRAPH_IPS_POPOVER_CONTENT_ID}
      >
        {ips.map((ip, index) => (
          <ExpandPopoverListItem
            key={index}
            label={ip}
            data-test-subj={GRAPH_IPS_POPOVER_IP_ID}
            showToolTip={false}
          />
        ))}
      </EuiListGroup>
    ),
    [ips]
  );

  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <GraphPopover
      panelPaddingSize="s"
      anchorPosition="rightCenter"
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={actions.closePopover}
      panelStyle={{ maxHeight: '336px', overflowY: 'auto' }}
      data-test-subj={GRAPH_IPS_POPOVER_ID}
    >
      {ips.length > VISIBLE_IPS_LIMIT ? popoverContent : null}
    </GraphPopover>
  ));

  const onIpClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => actions.openPopover(e.currentTarget),
    [actions]
  );

  return useMemo(
    () => ({
      id,
      onIpClick,
      PopoverComponent,
      actions,
      state,
    }),
    [PopoverComponent, actions, id, state, onIpClick]
  );
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
      {ips.slice(0, VISIBLE_IPS_LIMIT).join(', ')}
    </EuiText>
  );

  const counter =
    ips.length > VISIBLE_IPS_LIMIT ? (
      <EuiButtonEmpty
        size="xs"
        color="text"
        data-test-subj={GRAPH_IPS_PLUS_COUNT_ID}
        onClick={onIpClick}
        aria-label={toolTipAriaLabel}
        css={css`
          font-weight: medium;
          ${xsFontSize};
        `}
      >
        {`+${ips.length - VISIBLE_IPS_LIMIT}`}
      </EuiButtonEmpty>
    ) : null;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" justifyContent="center">
      {visibleIps}
      {counter}
    </EuiFlexGroup>
  );
};
