/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { ADD_SOURCE_LABEL, NO_SOURCES_DESCRIPTION, NO_SOURCES_TITLE } from './translations';

export const NoSourcesCallout = () => {
  const history = useHistory();

  return (
    <EuiCallOut
      color="warning"
      iconType="database"
      title={NO_SOURCES_TITLE}
      data-test-subj="nightshiftDetectionNoSourcesCallout"
      text={
        <p>
          {NO_SOURCES_DESCRIPTION}{' '}
          <EuiLink
            data-test-subj="nightshiftNoSourcesCalloutLink"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SOURCES,
              element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_NO_SOURCES_CALLOUT,
            })}
            {...reactRouterNavigate(history, '/sources')}
          >
            {ADD_SOURCE_LABEL}
          </EuiLink>
        </p>
      }
    />
  );
};
