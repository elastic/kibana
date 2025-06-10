/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getActivePrivilegedUsersEsqlCount } from './esql_query';
import { createKeyInsightsPanelLensAttributes } from '../common/lens_attributes';

import { VisualizationEmbeddable } from '../../../../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  timerange: {
    from: string;
    to: string;
  };
}

export const ActivePrivilegedUsersTile: React.FC<Props> = ({ timerange }) => {
  const lensAttributes = createKeyInsightsPanelLensAttributes({
    title: 'Active Privileged Users',
    label: 'Active Privileged Users',
    esqlQuery: getActivePrivilegedUsersEsqlCount('default'),
  });

  return (
    <EuiFlexItem grow={false}>
      <div
        css={css`
          height: ${LENS_VISUALIZATION_HEIGHT}px;
          min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
          width: auto;
          display: inline-block;
        `}
      >
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={true}
          applyPageAndTabsFilters={true}
          lensAttributes={lensAttributes}
          id="privileged-user-monitoring-active-users"
          timerange={timerange}
          width="auto"
          height={LENS_VISUALIZATION_HEIGHT}
          disableOnClickFilter
          inspectTitle={
            <FormattedMessage
              id="xpack.securitySolution.privmon.activePrivilegedUsers.inspectTitle"
              defaultMessage="Active privileged users"
            />
          }
        />
      </div>
    </EuiFlexItem>
  );
};

const LENS_VISUALIZATION_HEIGHT = 126;
const LENS_VISUALIZATION_MIN_WIDTH = 160;
