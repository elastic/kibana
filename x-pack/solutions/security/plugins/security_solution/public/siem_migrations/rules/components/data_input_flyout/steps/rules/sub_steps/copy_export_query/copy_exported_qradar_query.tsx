/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CopyExportedQradarQuery = React.memo(() => {
  return (
    <EuiText>
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.copyExportedQradarQuery.description"
        values={{
          download: (
            <b>
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.copyExportedQradarQuery.download"
                defaultMessage="Download"
              />
            </b>
          ),
          xmlFileOption: (
            <b>
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.copyExportedQradarQuery.xmlFileOption"
                defaultMessage="XML file option"
              />
            </b>
          ),
        }}
        defaultMessage="On the Use Case Explorer page, after clicking on the {download} button, select the second option in the Export window. Only the {xmlFileOption} is supported for export rules and dependencies. Leave the default options for the selected checkboxes regarding MITRE mappings and for custom rule attribute mappings."
      />
    </EuiText>
  );
});

CopyExportedQradarQuery.displayName = 'CopyExportedQradarQuery';
