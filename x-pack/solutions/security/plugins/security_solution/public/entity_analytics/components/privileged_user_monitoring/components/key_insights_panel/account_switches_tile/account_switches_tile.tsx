/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { getAccountSwitchesEsqlCount } from './esql_query';
import { createKeyInsightsPanelLensAttributes } from '../common/lens_attributes';

import { VisualizationEmbeddable } from '../../../../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  timerange: {
    from: string;
    to: string;
  };
}

const accountSwitchesLensAttributes: LensAttributes = createKeyInsightsPanelLensAttributes({
  title: 'Account Switches',
  label: 'Account Switches',
  esqlQuery: getAccountSwitchesEsqlCount('default'),
});

const LENS_VISUALIZATION_HEIGHT = 126;
const LENS_VISUALIZATION_MIN_WIDTH = 160;

export const AccountSwitchesTile: React.FC<Props> = ({ timerange }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false}>
      <div
        css={css`
          height: ${LENS_VISUALIZATION_HEIGHT}px;
          min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
          width: auto;
          display: inline-block;
          background: ${euiTheme.colors.lightestShade};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={true}
          applyPageAndTabsFilters={true}
          lensAttributes={accountSwitchesLensAttributes}
          id="privileged-user-monitoring-account-switches"
          timerange={timerange}
          width="auto"
          height={LENS_VISUALIZATION_HEIGHT}
          disableOnClickFilter
          inspectTitle={
            <FormattedMessage
              id="xpack.securitySolution.privmon.accountSwitches.inspectTitle"
              defaultMessage="Account switches"
            />
          }
        />
      </div>
    </EuiFlexItem>
  );
};
