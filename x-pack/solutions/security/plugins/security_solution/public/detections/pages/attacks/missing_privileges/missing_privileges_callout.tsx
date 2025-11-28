/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import hash from 'object-hash';
import { i18n } from '@kbn/i18n';

import { missingPrivilegesCallOutBody } from '../../../../common/components/missing_privileges';
import {
  type MissingIndexPrivileges,
  type MissingPrivileges,
  useMissingPrivileges,
} from '../../../../common/hooks/use_missing_privileges';
import { type CallOutMessage, CallOutSwitcher } from '../../../../common/components/callouts';
import { useGetMissingIndexPrivileges } from '../../../../attack_discovery/pages/use_get_missing_index_privileges';

export const MissingPrivilegesCallOut = React.memo(() => {
  const missingDetectionsPrivileges = useMissingPrivileges();
  const { data: missingIndexPrivileges = [] } = useGetMissingIndexPrivileges();

  const message: CallOutMessage | null = useMemo(() => {
    const missingPrivileges: MissingPrivileges = {
      featurePrivileges: missingDetectionsPrivileges.featurePrivileges,
      indexPrivileges: [
        ...missingDetectionsPrivileges.indexPrivileges,

        // include missing attack discovery index privileges
        ...missingIndexPrivileges.map<MissingIndexPrivileges>(
          ({ index_name: indexName, privileges }) => [indexName, privileges]
        ),
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
      id: `missing-attacks-privileges-${missingPrivilegesHash}`,
      title: i18n.translate('xpack.securitySolution.attacks.missingPrivileges.title', {
        defaultMessage: 'Insufficient privileges',
      }),
      description: missingPrivilegesCallOutBody(missingPrivileges),
    };
  }, [missingDetectionsPrivileges, missingIndexPrivileges]);

  if (!message) {
    return null;
  }
  return <CallOutSwitcher namespace="attacks" condition={true} message={message} />;
});
MissingPrivilegesCallOut.displayName = 'MissingPrivilegesCallOut';
