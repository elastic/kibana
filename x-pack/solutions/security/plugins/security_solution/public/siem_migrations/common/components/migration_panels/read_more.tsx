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
import type { MigrationType } from '../../../../../common/siem_migrations/types';

interface ReadMoreProps {
  migrationType: MigrationType;
}

export const MigrationsReadMore = React.memo<ReadMoreProps>(({ migrationType }) => {
  const docLink = useKibana().services.docLinks.links.securitySolution.siemMigrations;
  const dataTestSubj = `${migrationType}MigrationReadMore`;

  return (
    <PanelText size="xs" subdued data-test-subj={dataTestSubj}>
      <p>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.panels.help.readMore"
          defaultMessage="Read more about our AI powered translations and other features. {readMore}"
          values={{
            readMore: (
              <EuiLink href={docLink} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.panels.help.readDocs"
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
MigrationsReadMore.displayName = 'MigrationsReadMore';
