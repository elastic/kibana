/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EntityIcon } from './entity_icon';
import { EntityNodeMetadata } from './entity_node_metadata';
import type { EntityNodeViewModel } from '../../types';
import { showStackedShape } from '../../utils';
import { GRAPH_ENTITY_NODE_CARD_ID, GRAPH_STACKED_SHAPE_ID } from '../../test_ids';
import { ENTITY_NODE_WIDTH } from '../styles';

/**
 * Horizontal inset (per side) of the stacked-card strip relative to the main card,
 * so a 300px card shows a 268px strip peeking below it (matches the Figma design).
 */
const STACKED_SHAPE_INSET = 16;
const STACKED_SHAPE_WIDTH = ENTITY_NODE_WIDTH - STACKED_SHAPE_INSET * 2;

export interface EntityNodeDetailedProps {
  data: EntityNodeViewModel;
}

export const EntityNodeDetailed = ({ data }: EntityNodeDetailedProps) => {
  const {
    color = 'primary',
    icon,
    label,
    entityType,
    entityIds,
    ips,
    countryCodes,
    riskScore,
    assetCriticality,
    count,
    showMetadata = true,
    ipClickHandler,
    countryClickHandler,
    entityIdClickHandler,
  } = data;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m');

  const isDanger = color === 'danger';
  const headerBg = isDanger
    ? euiTheme.colors.backgroundBaseDanger
    : euiTheme.colors.backgroundBasePrimary;
  const borderColor = isDanger
    ? euiTheme.colors.borderBaseDanger
    : euiTheme.colors.borderBasePrimary;
  const stacked = showStackedShape(count);

  return (
    <div
      data-test-subj={GRAPH_ENTITY_NODE_CARD_ID}
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        width: ${ENTITY_NODE_WIDTH}px;
      `}
    >
      {/* Stacked-card effect: a narrower card edge peeking out below the main card
          to indicate this node represents a group of entities. */}
      {stacked ? (
        <div
          data-test-subj={GRAPH_STACKED_SHAPE_ID}
          css={css`
            height: ${euiTheme.size.s};
            width: ${STACKED_SHAPE_WIDTH}px;
            border: ${euiTheme.border.width.thin} solid ${borderColor};
            border-top: none;
            border-bottom-left-radius: ${euiTheme.border.radius.medium};
            border-bottom-right-radius: ${euiTheme.border.radius.medium};
            background-color: ${euiTheme.colors.backgroundBasePlain};
            order: 2;
            margin-top: -${euiTheme.border.width.thin};
            ${shadow}
          `}
        />
      ) : null}

      <div
        css={css`
          order: 1;
          width: 100%;
          border: ${euiTheme.border.width.thin} solid ${borderColor};
          border-radius: ${euiTheme.border.radius.medium};
          background-color: ${euiTheme.colors.backgroundBasePlain};
          overflow: hidden;
          ${shadow}
        `}
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          css={css`
            padding: ${euiTheme.size.s};
            background-color: ${headerBg};
          `}
        >
          <EuiFlexItem grow={false}>
            <EntityIcon icon={icon} color={color} count={count} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{label}</strong>
            </EuiText>
            {entityType ? (
              <EuiText size="xs" color="subdued">
                {entityType}
              </EuiText>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>

        {showMetadata ? (
          <EntityNodeMetadata
            ips={ips}
            countryCodes={countryCodes}
            entityIds={entityIds}
            riskScore={riskScore}
            assetCriticality={assetCriticality}
            onIpClick={ipClickHandler}
            onCountryClick={countryClickHandler}
            onEntityIdClick={entityIdClickHandler}
          />
        ) : null}
      </div>
    </div>
  );
};

EntityNodeDetailed.displayName = 'EntityNodeDetailed';
