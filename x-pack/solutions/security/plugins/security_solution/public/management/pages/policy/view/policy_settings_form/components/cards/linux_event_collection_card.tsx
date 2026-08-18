/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { PolicyFormComponentCommonProps } from '../../types';
import { EventCollectionCard } from '../event_collection_card';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import {
  applyLinuxSessionDataClearsTty,
  getLinuxEventCollectionCheckboxOptions,
  getLinuxSupplementalOptionsForMode,
} from './linux_event_collection_options';

export type LinuxEventCollectionCardProps = PolicyFormComponentCommonProps;

export const LinuxEventCollectionCard = memo<LinuxEventCollectionCardProps>(
  ({ onChange, mode, ...restProps }) => {
    const isLinuxDnsEnabled = useIsExperimentalFeatureEnabled('linuxDnsEvents');

    const options = useMemo(
      () => getLinuxEventCollectionCheckboxOptions(isLinuxDnsEnabled),
      [isLinuxDnsEnabled]
    );

    const supplementalOptions = useMemo(() => getLinuxSupplementalOptionsForMode(mode), [mode]);

    const savedLinuxTtyIoWhenSessionWasOnRef = useRef<boolean | undefined>(undefined);

    const changeHandler: PolicyFormComponentCommonProps['onChange'] = useCallback(
      ({ isValid, updatedPolicy }) => {
        if (isValid) {
          const prev = restProps.policy;
          if (prev.linux.events.session_data && !updatedPolicy.linux.events.session_data) {
            savedLinuxTtyIoWhenSessionWasOnRef.current = prev.linux.events.tty_io;
          }
          if (!prev.linux.events.session_data && updatedPolicy.linux.events.session_data) {
            if (savedLinuxTtyIoWhenSessionWasOnRef.current !== undefined) {
              updatedPolicy.linux.events.tty_io = savedLinuxTtyIoWhenSessionWasOnRef.current;
            }
          }
          applyLinuxSessionDataClearsTty(updatedPolicy);
        }

        onChange({ isValid, updatedPolicy });
      },
      [onChange, restProps.policy]
    );

    return (
      <EventCollectionCard<OperatingSystem.LINUX>
        {...restProps}
        mode={mode}
        onChange={changeHandler}
        os={OperatingSystem.LINUX}
        selection={restProps.policy.linux.events}
        supplementalOptions={supplementalOptions}
        options={options}
      />
    );
  }
);
LinuxEventCollectionCard.displayName = 'LinuxEventCollectionCard';
