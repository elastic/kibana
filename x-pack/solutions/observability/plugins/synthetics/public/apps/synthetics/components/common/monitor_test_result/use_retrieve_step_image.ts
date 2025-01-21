/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ScreenshotImageBlob,
  ScreenshotRefImageData,
  isScreenshotRef,
} from '../../../../../../common/runtime_types';
import { useComposeImageFromRef } from '../../../hooks/use_composite_image';
import { BackoffOptions, getJourneyScreenshot } from '../../../state';

type ImageResponse = ScreenshotImageBlob | ScreenshotRefImageData | null;
interface ImageDataResult {
  [imgPath: string]: {
    attempts?: number;
    data?: ImageResponse;
    url?: string;
    stepName?: string;
    loading?: boolean;
    maxSteps?: number;
  };
}

export const useRetrieveStepImage = ({
  timestamp,
  checkGroup,
  stepStatus,
  hasIntersected,
  imgPath,
  testNowMode,
  retryFetchOnRevisit,
}: {
  timestamp?: string;
  checkGroup: string | undefined;
  imgPath: string;
  stepStatus?: string;
  hasIntersected: boolean;

  testNowMode?: boolean;

  /**
   * Whether to retry screenshot image fetch on revisit (when intersection change triggers).
   * Will only re-fetch if an image fetch wasn't successful in previous attempts.
   * Set this to `true` from "Run Once" / "Test Now" modes
   *
   */
  retryFetchOnRevisit: boolean;
}) => {
  const [imgState, setImgState] = useState<ImageDataResult>({});
  const skippedStep = stepStatus === 'skipped';

  const imageResult = useGetStepScreenshotUrls(checkGroup, imgPath, imgState);
  const isImageUrlAvailable = imageResult?.[imgPath]?.url ?? false;

  const shouldFetch = useMemo(() => {
    const shouldRetry = retryFetchOnRevisit || !(imgState[imgPath]?.attempts ?? 0 > 0);
    return !skippedStep && hasIntersected && !isImageUrlAvailable && shouldRetry && checkGroup;
  }, [
    checkGroup,
    hasIntersected,
    imgPath,
    imgState,
    isImageUrlAvailable,
    retryFetchOnRevisit,
    skippedStep,
  ]);

  useEffect(() => {
    async function run() {
      if (shouldFetch) {
        setImgState((prevState) => {
          return getUpdatedState({ prevState, imgPath, increment: true, loading: true });
        });
        const backoffOptions: Partial<BackoffOptions> | undefined = !testNowMode
          ? { shouldBackoff: false }
          : undefined;
        try {
          getJourneyScreenshot(imgPath, backoffOptions).then((data) =>
            setImgState((prevState) =>
              getUpdatedState({
                prevState,
                imgPath,
                increment: false,
                data,
                loading: false,
              })
            )
          );
        } catch (e: unknown) {
          setImgState((prevState) => {
            return getUpdatedState({ prevState, imgPath, increment: false, loading: false });
          });
        }
      }
    }
    run();
  }, [imgPath, shouldFetch, testNowMode]);

  return imageResult;
};

/**
 * This hooks takes care of whether the image is of type `ScreenshotImageBlob` or
 * `ScreenshotRefImageData`. It returns the plain `imageUrl: string` in both cases
 * along with whether the image is being loaded/composing.
 */
function useGetStepScreenshotUrls(
  checkGroup: string | undefined,
  imgPath: string,
  dataResult: ImageDataResult
) {
  const [imgDataState, setImgDataState] = useState<ImageDataResult>();

  // Retrieve `maxSteps` from any available step of the checkGroup
  const maxSteps = useMemo(() => {
    return checkGroup
      ? Object.entries(dataResult).find(
          ([key, value]) => key.includes(checkGroup) && value?.data?.maxSteps
        )?.[1]?.data?.maxSteps
      : undefined;
  }, [checkGroup, dataResult]);

  const screenshotRef = isScreenshotRef(dataResult[imgPath]?.data)
    ? dataResult[imgPath]?.data
    : undefined;

  const { isComposing, imgSrc } = useComposeImageFromRef(screenshotRef as ScreenshotRefImageData);

  useEffect(() => {
    const url = screenshotRef ? imgSrc : (dataResult[imgPath]?.data as ScreenshotImageBlob)?.src;
    const stepName = dataResult[imgPath]?.stepName;
    const isLoading = (dataResult[imgPath]?.loading ?? false) || isComposing;

    setImgDataState((prevState) => {
      return getUpdatedState({
        prevState,
        imgPath,
        maxSteps,
        url,
        stepName,
        loading: isLoading,
      });
    });
  }, [imgPath, maxSteps, dataResult, screenshotRef, isComposing, imgSrc]);

  return imgDataState;
}

function getUpdatedState({
  prevState,
  imgPath,
  increment,
  url,
  stepName,
  maxSteps,
  data,
  loading,
}: {
  prevState?: ImageDataResult;
  imgPath: string;
  increment?: boolean;
  url?: string;
  stepName?: string;
  maxSteps?: number;
  data?: ImageResponse;
  loading?: boolean;
}): ImageDataResult {
  const newAttempts = (prevState?.[imgPath]?.attempts ?? 0) + (increment ? 1 : 0);
  const newData = data ?? prevState?.[imgPath]?.data ?? null;
  const newLoading = loading ?? prevState?.[imgPath]?.loading ?? false;
  const newUrl = url ?? prevState?.[imgPath]?.url;
  const newMaxSteps = maxSteps ?? prevState?.[imgPath]?.data?.maxSteps;
  const newStepName = data?.stepName ?? stepName ?? prevState?.[imgPath]?.stepName;

  return {
    ...prevState,
    [imgPath]: {
      attempts: newAttempts,
      data: newData,
      url: newUrl,
      stepName: newStepName,
      maxSteps: newMaxSteps,
      loading: newLoading,
    },
  };
}
