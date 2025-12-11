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
import { ALL_NBA } from './nba_translations';
import type { NBA, NBAAction } from './nba_translations';
import type { Milestone } from '../../common/trial_companion/types';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

export const TrialCompanion: React.FC<Props> = () => {
  const { ...startServices } = useKibana().services;
  const trialCompanionEnabled = useIsExperimentalFeatureEnabled('trialCompanionEnabled');
  if (!startServices.cloud?.isInTrial() || !trialCompanionEnabled) {
    return null;
  }
  return <TrialCompanionImpl />;
};

const defaultTimeout = 30000;

const TrialCompanionImpl: React.FC<Props> = () => {
  const { overlays, ...startServices } = useKibana().services;
  const bannerId = useRef<string | undefined>();
  const [count, setCount] = useState(0);
  const [previousMilestone, setPreviousMilestone] = useState<Milestone | undefined>(undefined);
  const { value, loading } = useGetNBA([count]);

  const milestoneId = value?.milestoneId; // no milestoneId means anything to show

  useInterval(() => {
    setCount((c) => c + 1);
  }, defaultTimeout);

  useEffect(() => {
    const removeBanner = () => {
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
      if (!nba) {
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
