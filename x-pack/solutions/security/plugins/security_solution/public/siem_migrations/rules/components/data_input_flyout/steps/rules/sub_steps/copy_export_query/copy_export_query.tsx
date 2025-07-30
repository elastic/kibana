/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CopyQuery } from '../../../../../../../common/components/copy_query';
import * as i18n from './translations';
import { RULES_SPLUNK_QUERY } from '../../../../constants';

interface CopyExportQueryProps {
  onCopied: () => void;
}

export const CopyExportQuery = React.memo<CopyExportQueryProps>(({ onCopied }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.copyExportQuery.description"
            defaultMessage="Log in to your Splunk admin account, go to the {section} app and run the following query. Export your results as {format}."
            values={{
              section: <b>{i18n.RULES_DATA_INPUT_COPY_DESCRIPTION_SECTION}</b>,
              format: <b>{'JSON'}</b>,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <CopyQuery query={RULES_SPLUNK_QUERY} onCopied={onCopied} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rulesFileUpload.disclaimer"
            defaultMessage="Note: To avoid exceeding your LLM API rate limit when translating a large number of queries, consider exporting rules in batches, for example by adding {operator} to the query above"
            values={{ operator: <EuiCode>{'| head'}</EuiCode> }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CopyExportQuery.displayName = 'CopyExportQuery';
