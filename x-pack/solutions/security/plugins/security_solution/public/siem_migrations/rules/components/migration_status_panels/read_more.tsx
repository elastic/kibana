/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PanelText } from '../../../../common/components/panel_text';
import { useKibana } from '../../../../common/lib/kibana/use_kibana';

export const RuleMigrationsReadMore = React.memo(() => {
  const docLink = useKibana().services.docLinks.links.securitySolution.siemMigrations;
  return (
    <PanelText size="xs" subdued>
      <p>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rules.panel.help.readMore"
          defaultMessage="Read more about our AI powered translations and other features. {readMore}"
          values={{
            readMore: (
              <EuiLink href={docLink} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rules.panel.help.readDocs"
                  defaultMessage="Read AI docs"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </PanelText>
  );
});
RuleMigrationsReadMore.displayName = 'RuleMigrationsReadMore';
