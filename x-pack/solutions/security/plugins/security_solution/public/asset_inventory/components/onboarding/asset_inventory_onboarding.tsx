/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { GetStarted } from './get_started';
import { AssetInventoryLoading } from '../asset_inventory_loading';
import { useAssetInventoryStatus } from '../../hooks/use_asset_inventory_status';
import { Initializing } from './initializing';

/**
 * This component serves as a wrapper to render appropriate onboarding screens
 * based on the current onboarding status. If no specific onboarding status
 * matches, it will render the child components.
 */
export const AssetInventoryOnboarding: FC<PropsWithChildren> = ({ children }) => {
  const { data, isLoading } = useAssetInventoryStatus();

  if (isLoading || !data) {
    return <AssetInventoryLoading />;
  }

  const { status, privileges } = data;

  // Render different screens based on the onboarding status.
  switch (status) {
    case 'disabled': // The user has not yet started the onboarding process.
      return <GetStarted />;
    case 'initializing': // The onboarding process is currently initializing.
      return <Initializing />;
    case 'empty': // Todo: Onboarding cannot proceed because no relevant data was found.
      return <div>{'No data found.'}</div>;
    case 'permission_denied': // Todo: User lacks the necessary permissions to proceed.
      return (
        <div>
          {'Permission denied.'}
          <pre>{JSON.stringify(privileges)}</pre>
        </div>
      );
    default:
      // If no onboarding status matches, render the child components.
      return children;
  }
};
