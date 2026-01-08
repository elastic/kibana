/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import hash from 'object-hash';
import type { CallOutMessage } from '../callouts';
import { CallOutSwitcher } from '../callouts';
import * as i18n from './translations';
import type { MissingPrivileges } from '../../hooks/use_missing_privileges';

interface MissingPrivilegesCallOutProps {
  namespace: string;
  missingPrivileges: MissingPrivileges;
}

/**
 * Callout that displays a Callout when the user has missing privileges.
 */
export const MissingPrivilegesCallOut = memo<MissingPrivilegesCallOutProps>(
  ({ namespace, missingPrivileges }) => {
    const MissingPrivilegesMessage: CallOutMessage | null = useMemo(() => {
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
        id: `missing-user-privileges-${missingPrivilegesHash}`,
        title: i18n.MISSING_PRIVILEGES_CALLOUT_TITLE,
        description: i18n.missingPrivilegesCallOutBody(missingPrivileges),
      };
    }, [missingPrivileges]);

    return (
      MissingPrivilegesMessage && (
        <CallOutSwitcher
          namespace={namespace}
          condition={true}
          message={MissingPrivilegesMessage}
        />
      )
    );
  }
);

MissingPrivilegesCallOut.displayName = 'MissingPrivilegesCallOut';
