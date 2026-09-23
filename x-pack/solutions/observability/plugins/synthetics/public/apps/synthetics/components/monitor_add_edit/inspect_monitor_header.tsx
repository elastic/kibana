/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import React, { createContext, useContext, useMemo, useState } from 'react';

export const INSPECT_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorInspect.inspectLabel',
  {
    defaultMessage: 'Inspect configuration',
  }
);

export const VALID_CONFIG_LABEL = i18n.translate(
  'xpack.synthetics.monitorInspect.formattedConfigLabel.valid',
  {
    defaultMessage: 'Only valid form configurations can be inspected.',
  }
);

export const FORMATTED_CONFIG_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorInspect.formattedConfigLabel.description',
  {
    defaultMessage: 'View formatted configuration for this monitor.',
  }
);

export interface InspectMonitorHeaderApi {
  open: () => void;
  isValid: boolean;
}

const InspectMonitorHeaderContext = createContext<
  ((api: InspectMonitorHeaderApi | null) => void) | undefined
>(undefined);

export function useRegisterInspectMonitorHeader():
  | ((api: InspectMonitorHeaderApi | null) => void)
  | undefined {
  return useContext(InspectMonitorHeaderContext);
}

export function InspectMonitorHeaderProvider({
  register,
  children,
}: {
  register: (api: InspectMonitorHeaderApi | null) => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <InspectMonitorHeaderContext.Provider value={register}>
      {children}
    </InspectMonitorHeaderContext.Provider>
  );
}

export function useInspectMonitorHeader(): {
  register: (api: InspectMonitorHeaderApi | null) => void;
  primaryActionItem: NonNullable<AppHeaderMenu['primaryActionItem']>;
} {
  const [api, setApi] = useState<InspectMonitorHeaderApi | null>(null);

  const primaryActionItem = useMemo<NonNullable<AppHeaderMenu['primaryActionItem']>>(
    () => ({
      id: 'inspectConfiguration',
      label: INSPECT_MONITOR_LABEL,
      iconType: 'inspect',
      testId: 'syntheticsMonitorInspectShowFlyoutExampleButton',
      disableButton: !api?.isValid,
      tooltipContent: api?.isValid ? FORMATTED_CONFIG_DESCRIPTION : VALID_CONFIG_LABEL,
      run: () => {
        api?.open();
      },
    }),
    [api]
  );

  return { register: setApi, primaryActionItem };
}
