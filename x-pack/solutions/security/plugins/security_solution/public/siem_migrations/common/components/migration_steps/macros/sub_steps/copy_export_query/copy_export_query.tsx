/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MACROS_SPLUNK_QUERY } from '../../../..';
import * as i18n from './translations';
import { CopyQuery } from '../../../../copy_query';

interface CopyExportQueryProps {
  onCopied: () => void;
}
export const CopyExportQuery = React.memo<CopyExportQueryProps>(({ onCopied }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s" data-test-subj="migrationCopyExportQueryDescription">
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.macros.copyExportQuery.description"
            defaultMessage="From you admin Splunk account, go to the {section} app and run the above query. Export your results as {format}."
            values={{
              section: <b>{i18n.MACROS_DATA_INPUT_COPY_DESCRIPTION_SECTION}</b>,
              format: <b>{'JSON'}</b>,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <CopyQuery query={MACROS_SPLUNK_QUERY} onCopied={onCopied} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CopyExportQuery.displayName = 'CopyExportQuery';
