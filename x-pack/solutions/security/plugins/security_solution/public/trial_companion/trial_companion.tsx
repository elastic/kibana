/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useInterval from 'react-use/lib/useInterval';

import React, { useEffect, useRef, useState } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { NBANotification } from './nba_notification';
import { useKibana } from '../common/lib/kibana';
import { useGetNBA } from './hooks/use_get_nba';
import { postNBAUserSeen } from './api';
import { ALL_NBA } from '../../common/trial_companion/constants';
import type { Milestone, NBA, NBAAction } from '../../common/trial_companion/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

export const TrialCompanion: React.FC<Props> = () => {
  const { overlays, ...startServices } = useKibana().services;
  const bannerId = useRef<string | undefined>();
  const [count, setCount] = useState(0);
  const [previousMilestone, setPreviousMilestone] = useState<Milestone | undefined>(undefined);

  const { value, error, loading } = useGetNBA([count]);
  window.console.log('TrialNotification useGetNotification:', error, loading, value); // TODO: remove
  const milestoneId = value?.milestoneId; // no milestoneId means nothing to show

  useInterval(() => {
    setCount((c) => c + 1);
  }, 30000); // TODO: constant

  // TODO: if error - do not show anything?

  useEffect(() => {
    window.console.log('running effect on change:', milestoneId, loading);
    const removeBanner = () => {
      window.console.log('remove banner with id:', bannerId.current);
      if (bannerId.current) {
        overlays.banners.remove(bannerId.current);
      }
      bannerId.current = undefined;
    };

    const onSeenBanner = () => {
      if (milestoneId) {
        postNBAUserSeen(milestoneId);
      }
      removeBanner();
    };

    if (!loading && milestoneId && (!bannerId.current || milestoneId !== previousMilestone)) {
      const nba: NBA | undefined = ALL_NBA.get(milestoneId);
      window.console.log(`nba: ${JSON.stringify(nba)}`);
      if (!nba) {
        window.console.warn('No NBA found for milestoneId:', milestoneId);
        return;
      }

      let onViewButton: (() => void) | undefined;
      let viewButtonText: string | undefined;

      if (nba.apps && nba.apps.length > 0) {
        const nbaAction: NBAAction = nba.apps[0];
        onViewButton = () => {
          startServices.application.navigateToApp(nbaAction.app);
        };
        viewButtonText = nbaAction.text;
      }

      const component = (
        <NBANotification
          title={nba.title}
          message={nba.message}
          viewButtonText={viewButtonText}
          onSeenBanner={onSeenBanner}
          onViewButton={onViewButton}
        />
      );
      const mount = toMountPoint(component, startServices);
      window.console.log('mounted banner with id:', bannerId.current, milestoneId);
      bannerId.current = overlays.banners.replace(bannerId.current, mount, 1000);
      setPreviousMilestone(milestoneId);
    } else if (bannerId.current && !milestoneId && !loading) {
      removeBanner();
    } // else do nothing, keep the banner shown
  }, [overlays, startServices, milestoneId, loading, previousMilestone]);

  useEffect(() => {
    return () => {
      if (bannerId.current) {
        overlays.banners.remove(bannerId.current);
      }
      bannerId.current = undefined;
    };
  }, [overlays]);

  return null;
};
