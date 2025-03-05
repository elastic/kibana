/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import hash from 'object-hash';
import { i18n } from '@kbn/i18n';
import { DEFAULT_LISTS_INDEX, DEFAULT_ITEMS_INDEX } from '../../../../common/constants';
import { missingPrivilegesCallOutBody } from '../../../detections/components/callouts/missing_privileges_callout/translations';
import {
  useMissingPrivileges,
  type MissingPrivileges,
  type MissingIndexPrivileges,
} from '../../../detections/components/callouts/missing_privileges_callout/use_missing_privileges';
import { CallOutSwitcher, type CallOutMessage } from '../../../common/components/callouts';
import { useGetMigrationMissingPrivileges } from '../logic/use_get_migration_privileges';

export const MissingPrivilegesCallOut = React.memo(() => {
  const missingDetectionsPrivileges = useMissingPrivileges();
  const { data: missingIndexPrivileges = [] } = useGetMigrationMissingPrivileges();

  const message: CallOutMessage | null = useMemo(() => {
    const missingPrivileges: MissingPrivileges = {
      featurePrivileges: missingDetectionsPrivileges.featurePrivileges,
      indexPrivileges: [
        // include rules missing detections index privileges except of lists and items indices
        ...missingDetectionsPrivileges.indexPrivileges.filter(
          ([indexName]) =>
            !indexName.startsWith(DEFAULT_LISTS_INDEX) && !indexName.startsWith(DEFAULT_ITEMS_INDEX)
        ),
        // include missing siem migrations index privileges (lookups)
        ...missingIndexPrivileges.map<MissingIndexPrivileges>(({ indexName, privileges }) => [
          indexName,
          privileges,
        ]),
      ],
    };

    const hasMissingPrivileges =
      missingPrivileges.indexPrivileges.length > 0 ||
      missingPrivileges.featurePrivileges.length > 0;

    if (!hasMissingPrivileges) {
      return null;
    }

    const missingPrivilegesHash = hash(missingPrivileges);
    return {
      type: 'primary',
      /**
       * Use privileges hash as a part of the message id.
       * We want to make sure that the user will see the
       * callout message in case his privileges change.
       * The previous click on Dismiss should not affect that.
       */
      id: `missing-siem-migrations-privileges-${missingPrivilegesHash}`,
      title: i18n.translate('xpack.securitySolution.siemMigrations.missingPrivileges.title', {
        defaultMessage: 'Insufficient privileges',
      }),
      description: missingPrivilegesCallOutBody(missingPrivileges),
    };
  }, [missingDetectionsPrivileges, missingIndexPrivileges]);

  if (!message) {
    return null;
  }
  return <CallOutSwitcher namespace="siemMigrations" condition={true} message={message} />;
});
MissingPrivilegesCallOut.displayName = 'MissingPrivilegesCallOut';
