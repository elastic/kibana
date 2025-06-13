/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useState } from 'react';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import {
  METRIC_TYPE,
  ML_JOB_TELEMETRY_STATUS,
  TELEMETRY_EVENT,
  EntityEventTypes,
  track,
} from '../../../lib/telemetry';

import { setupMlJob, startDatafeeds, stopDatafeeds } from '../api';
import type { ErrorResponse, SecurityJob } from '../types';
import * as i18n from './translations';

// Enable/Disable Job & Datafeed
export const useEnableDataFeed = () => {
  const { telemetry } = useKibana().services;

  const { addError } = useAppToasts();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Enables the data feed for a given ML job.
   * The job will start with either `latestTimestampMs` or `mlJobStartTime`, whichever is more recent.
   * @param job The `SecurityJob` to enable the DataFeed for
   * @param latestTimestampMs the latest timestamp of data associated with the job
   * @param mlJobStartTime If not provided, defaults to two weeks ago.
   */
  const enableDatafeed = useCallback(
    async (job: SecurityJob, latestTimestampMs: number, mlJobStartTime?: number) => {
      setIsLoading(true);
      track(
        METRIC_TYPE.COUNT,
        job.isElasticJob ? TELEMETRY_EVENT.SIEM_JOB_ENABLED : TELEMETRY_EVENT.CUSTOM_JOB_ENABLED
      );

      if (!job.isInstalled) {
        try {
          await setupMlJob({
            configTemplate: job.moduleId,
            indexPatternName: job.defaultIndexPattern,
            jobIdErrorFilter: [job.id],
            groups: job.groups,
          });
          telemetry.reportEvent(EntityEventTypes.MLJobUpdate, {
            jobId: job.id,
            isElasticJob: job.isElasticJob,
            moduleId: job.moduleId,
            status: ML_JOB_TELEMETRY_STATUS.moduleInstalled,
          });
        } catch (error) {
          setIsLoading(false);
          addError(error, { title: i18n.CREATE_JOB_FAILURE });
          telemetry.reportEvent(EntityEventTypes.MLJobUpdate, {
            jobId: job.id,
            isElasticJob: job.isElasticJob,
            moduleId: job.moduleId,
            status: ML_JOB_TELEMETRY_STATUS.installationError,
            errorMessage: `${i18n.CREATE_JOB_FAILURE} - ${error.message}`,
          });

          return { enabled: false };
        }
      }

      // By default, the start time for the job is no more than two weeks ago to ensure job performance
      const date = new Date();
      const maxStartTime = mlJobStartTime ?? date.setDate(date.getDate() - 14);

      const datafeedId = `datafeed-${job.id}`;

      const startTime = Math.max(latestTimestampMs, maxStartTime);

      try {
        const response = await startDatafeeds({
          datafeedIds: [datafeedId],
          start: startTime,
        });

        if (response[datafeedId]?.error) {
          throw new Error(response[datafeedId].error);
        }

        telemetry.reportEvent(EntityEventTypes.MLJobUpdate, {
          jobId: job.id,
          isElasticJob: job.isElasticJob,
          status: ML_JOB_TELEMETRY_STATUS.started,
        });

        return { enabled: response[datafeedId] ? response[datafeedId].started : false };
      } catch (error) {
        track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_ENABLE_FAILURE);
        addError(error, { title: i18n.START_JOB_FAILURE });
        telemetry.reportEvent(EntityEventTypes.MLJobUpdate, {
          jobId: job.id,
          isElasticJob: job.isElasticJob,
          status: ML_JOB_TELEMETRY_STATUS.startError,
          errorMessage: `${i18n.START_JOB_FAILURE} - ${error.message}`,
        });
      } finally {
        setIsLoading(false);
      }

      return { enabled: false };
    },
    [addError, telemetry]
  );

  const disableDatafeed = useCallback(
    async (job: SecurityJob) => {
      track(
        METRIC_TYPE.COUNT,
        job.isElasticJob ? TELEMETRY_EVENT.SIEM_JOB_DISABLED : TELEMETRY_EVENT.CUSTOM_JOB_DISABLED
      );
      setIsLoading(true);

      const datafeedId = `datafeed-${job.id}`;

      try {
        const [response] = await stopDatafeeds({ datafeedIds: [datafeedId] });

        if (isErrorResponse(response)) {
          throw new Error(response.error);
        }

        telemetry.reportEvent(EntityEventTypes.MLJobUpdate, {
          jobId: job.id,
          isElasticJob: job.isElasticJob,
          status: ML_JOB_TELEMETRY_STATUS.stopped,
        });

        return { enabled: response[datafeedId] ? !response[datafeedId].stopped : true };
      } catch (error) {
        track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.JOB_DISABLE_FAILURE);
        addError(error, { title: i18n.STOP_JOB_FAILURE });
        telemetry.reportEvent(EntityEventTypes.MLJobUpdate, {
          jobId: job.id,
          isElasticJob: job.isElasticJob,
          status: ML_JOB_TELEMETRY_STATUS.stopError,
          errorMessage: `${i18n.STOP_JOB_FAILURE} - ${error.message}`,
        });
      } finally {
        setIsLoading(false);
      }

      return { enabled: true };
    },
    [addError, telemetry]
  );

  return { enableDatafeed, disableDatafeed, isLoading };
};

const isErrorResponse = (response: ErrorResponse): response is ErrorResponse =>
  !isEmpty(response.error);
