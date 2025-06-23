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
import { getAuthenticationsEsqlCount } from './esql_query';
import { VisualizationEmbeddable } from '../../../../../../common/components/visualization_actions/visualization_embeddable';
import { createKeyInsightsPanelLensAttributes } from '../common/lens_attributes';
import { useEsqlGlobalFilterQuery } from '../../../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';

const LENS_VISUALIZATION_HEIGHT = 126;
const LENS_VISUALIZATION_MIN_WIDTH = 160;

export const AuthenticationsTile = () => {
  const filterQuery = useEsqlGlobalFilterQuery();
  const timerange = useGlobalTime();
  const spaceId = useSpaceId();

  const authenticationsTileLensAttributes = createKeyInsightsPanelLensAttributes({
    title: 'Authentications',
    label: 'Authentications',
    esqlQuery: getAuthenticationsEsqlCount(spaceId || 'default'),
    filterQuery,
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
          lensAttributes={authenticationsTileLensAttributes}
          id="privileged-user-monitoring-authentications"
          timerange={timerange}
          width="auto"
          height={LENS_VISUALIZATION_HEIGHT}
          disableOnClickFilter
          inspectTitle={
            <FormattedMessage
              id="xpack.securitySolution.privmon.authentications.inspectTitle"
              defaultMessage="Authentications"
            />
          }
        />
      </div>
    </EuiFlexItem>
  );
};
