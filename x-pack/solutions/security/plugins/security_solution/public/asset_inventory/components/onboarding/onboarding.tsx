/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { GetStarted } from './get_started';
import { useAssetInventoryContext } from '../../context';
import { Loading } from '../loading';

/**
 * This component serves as a wrapper to render appropriate onboarding screens
 * based on the current onboarding status. If no specific onboarding status
 * matches, it will render the child components.
 */
export const Onboarding: FC<PropsWithChildren> = ({ children }) => {
  const { status } = useAssetInventoryContext();

  // Render different screens based on the onboarding status.
  switch (status) {
    case 'loading': // The onboarding status is currently loading.
      return <Loading />;
    case 'disabled': // The user has not yet started the onboarding process.
      return <GetStarted />;
    // case 'initializing': // Todo: The onboarding process is currently initializing.
    // case 'empty': // Todo: Onboarding cannot proceed because no relevant data was found.
    // case 'permission_denied': // Todo: User lacks the necessary permissions to proceed.
    default:
      // If no onboarding status matches, render the child components.
      return children;
  }
};
