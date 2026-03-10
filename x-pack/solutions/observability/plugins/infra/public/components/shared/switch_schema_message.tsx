/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SCHEMA_SELECTOR_DOCS_LINK } from '../../../common/constants';

export function SwitchSchemaMessage({ dataTestSubj }: { dataTestSubj: string }) {
  return (
    <FormattedMessage
      id="xpack.infra.waffle.noDataInSelectedSchemaTitle"
      defaultMessage="{switchSchema} to view hosts matching another schema."
      values={{
        switchSchema: (
          <EuiLink data-test-subj={dataTestSubj} target="_blank" href={SCHEMA_SELECTOR_DOCS_LINK}>
            {i18n.translate('xpack.infra.waffle.switchSchemaDocsLink', {
              defaultMessage: 'Switch schema',
            })}
          </EuiLink>
        ),
      }}
    />
  );
}
