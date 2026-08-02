/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PndDiscoveryContextEntity } from '@kbn/pnd-common';

import { getEntityFieldDisplay } from '../helpers/get_entity_field_display';
import * as i18n from '../translations';

/**
 * `GET /internal/pnd/discovery-context` can return up to 100 entities — four
 * `terms` sub-aggregations at `size: 20`, with headroom — and the card is not a
 * scrolling surface. The lines arrive count-descending, so the cap keeps the
 * widest-reaching entities and counts the rest rather than dropping them
 * silently.
 */
export const MAX_BLAST_RADIUS_LINES = 6;

export interface BlastRadiusLinesProps {
  /** Merged entity terms for this proposal's discovery, highest count first. */
  entities: PndDiscoveryContextEntity[];
  /** The tone's eyebrow colour, so a line's glyph matches the card's chrome. */
  iconColor: string;
}

/**
 * The blast radius: which hosts, users and addresses the discovery's
 * constituent detection alerts touched (D2).
 *
 * An empty list is a **normal** state with three causes that all look like a
 * bug — an uncorrelated run, a discovery the caller cannot read, and one whose
 * alerts have aged out — so it says so rather than rendering nothing, which
 * would read as "this action touches nothing".
 */
export const BlastRadiusLines: React.FC<BlastRadiusLinesProps> = ({ entities, iconColor }) => {
  const { euiTheme } = useEuiTheme();

  const lineStyles = css`
    align-items: center;
    color: ${euiTheme.colors.textParagraph};
    display: flex;
    font-size: 14px;
    gap: ${euiTheme.size.m};
    line-height: 20px;
  `;

  const valueStyles = css`
    flex: 1;
    font-weight: ${euiTheme.font.weight.semiBold};
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const fieldStyles = css`
    color: ${euiTheme.colors.textSubdued};
    flex-shrink: 0;
  `;

  const countStyles = css`
    color: ${euiTheme.colors.textSubdued};
    flex-shrink: 0;
    font-size: 13px;
  `;

  if (entities.length === 0) {
    return (
      <EuiText color="subdued" data-test-subj="hitlActionCardBlastRadiusEmpty" size="s">
        <p>{i18n.BLAST_RADIUS_EMPTY}</p>
      </EuiText>
    );
  }

  const visible = entities.slice(0, MAX_BLAST_RADIUS_LINES);
  const hidden = entities.length - visible.length;

  return (
    <>
      {visible.map(({ count, field, value }) => {
        const { iconType, label } = getEntityFieldDisplay(field);

        return (
          <div css={lineStyles} data-test-subj="hitlActionCardEntity" key={`${field}:${value}`}>
            <EuiIcon aria-hidden={true} color={iconColor} size="m" type={iconType} />
            <span css={fieldStyles}>{label}</span>
            <span css={valueStyles}>{value}</span>
            <span css={countStyles}>{i18n.entityAlertCount(count)}</span>
          </div>
        );
      })}
      {hidden > 0 ? (
        <EuiText color="subdued" data-test-subj="hitlActionCardBlastRadiusOverflow" size="xs">
          <p>{i18n.moreEntities(hidden)}</p>
        </EuiText>
      ) : null}
    </>
  );
};
