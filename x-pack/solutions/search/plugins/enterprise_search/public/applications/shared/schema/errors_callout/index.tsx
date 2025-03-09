/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

import { EuiButtonTo } from '@kbn/search-connectors-plugin/public';

import { SCHEMA_ERRORS_TITLE, SCHEMA_ERRORS_DESCRIPTION, SCHEMA_ERRORS_BUTTON } from './constants';

interface Props {
  viewErrorsPath: string;
}

export const SchemaErrorsCallout: React.FC<Props> = ({ viewErrorsPath }) => (
  <EuiCallOut
    color="danger"
    iconType="warning"
    title={SCHEMA_ERRORS_TITLE}
    data-test-subj="schemaErrorsCallout"
  >
    <p>{SCHEMA_ERRORS_DESCRIPTION}</p>
    <EuiButtonTo to={viewErrorsPath} color="danger" fill size="s" data-test-subj="viewErrorsButton">
      {SCHEMA_ERRORS_BUTTON}
    </EuiButtonTo>
  </EuiCallOut>
);
