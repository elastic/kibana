/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouteMatch } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import {
  ScreenshotImageBlob,
  ScreenshotRefImageData,
} from '../../../../../../../common/runtime_types';
import { getJourneyScreenshot } from '../../../../../state/api/journey';
import { MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE } from '../../../../../../../common/constants';

const NUMBER_OF_RETRIES = 20;

export const useInProgressImage = ({
  stepStatus,
  hasImage,
  hasIntersected,
  imgPath,
}: {
  imgPath: string;
  stepStatus?: string;
  hasImage: boolean;
  hasIntersected: boolean;
}) => {
  const isAddRoute = useRouteMatch(MONITOR_ADD_ROUTE);
  const isEditRoute = useRouteMatch(MONITOR_EDIT_ROUTE);

  const [retryLoading, setRetryLoading] = useState(0);

  const skippedStep = stepStatus === 'skipped';

  const { data, loading } = useFetcher(() => {
    if (skippedStep) {
      return new Promise<ScreenshotImageBlob | ScreenshotRefImageData | null>((resolve) =>
        resolve(null)
      );
    }

    if (hasIntersected && !hasImage) return getJourneyScreenshot(imgPath);
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Uptime folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIntersected, imgPath, skippedStep, retryLoading]);

  useEffect(() => {
    if (!loading && !hasImage && (isAddRoute?.isExact || isEditRoute?.isExact) && !skippedStep) {
      setTimeout(() => {
        setRetryLoading((prevState) => {
          if (prevState < NUMBER_OF_RETRIES) {
            return prevState + 1;
          }
          return prevState;
        });
      }, 5 * 1000);
    }
  }, [hasImage, loading, isAddRoute?.isExact, isEditRoute?.isExact, skippedStep]);

  return {
    data,
    loading,
  };
};
