/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { BAND_COLORS } from '../lib/phase_definitions';

export const PipelineLegend = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      responsive={false}
      wrap
      gutterSize="s"
      alignItems="center"
      css={css`
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        background: ${euiTheme.colors.lightestShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage id="xpack.sdlcIntel.pipeline.legend.bands" defaultMessage="Bands" />
        </EuiText>
      </EuiFlexItem>
      {(['planning', 'delivery', 'feedback'] as const).map((band) => (
        <EuiFlexItem grow={false} key={band}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                css={css`
                  width: 9px;
                  height: 9px;
                  border-radius: 2px;
                  background: ${BAND_COLORS[band].border};
                  display: inline-block;
                `}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                {band === 'planning' ? (
                  <FormattedMessage
                    id="xpack.sdlcIntel.pipeline.legend.planning"
                    defaultMessage="Planning P1–P3"
                  />
                ) : band === 'delivery' ? (
                  <FormattedMessage
                    id="xpack.sdlcIntel.pipeline.legend.delivery"
                    defaultMessage="Delivery P4–P5"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.sdlcIntel.pipeline.legend.feedback"
                    defaultMessage="Feedback P6–P8"
                  />
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <span
          css={css`
            width: 1px;
            height: 14px;
            background: ${euiTheme.border.color};
            display: inline-block;
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage id="xpack.sdlcIntel.pipeline.legend.gates" defaultMessage="Gates" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <FormattedMessage id="xpack.sdlcIntel.pipeline.legend.pass" defaultMessage="Passed" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <FormattedMessage id="xpack.sdlcIntel.pipeline.legend.warn" defaultMessage="At risk" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <FormattedMessage id="xpack.sdlcIntel.pipeline.legend.fail" defaultMessage="Blocked" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.sdlcIntel.pipeline.legend.upcoming"
            defaultMessage="Upcoming"
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
