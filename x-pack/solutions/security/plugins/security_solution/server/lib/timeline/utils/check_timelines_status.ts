/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { join, resolve } from 'path';
import type {
  TimelineResponse,
  ImportTimelines,
  InstallPrepackedTimelinesRequestBody,
} from '../../../../common/api/timeline';

import type { FrameworkRequest } from '../../framework';

import { getExistingPrepackagedTimelines } from '../saved_object/timelines';

import { loadData, getReadables } from './common';

export const getTimelinesToUpdate = (
  timelinesFromFileSystem: ImportTimelines[],
  installedTimelines: TimelineResponse[]
): ImportTimelines[] => {
  return timelinesFromFileSystem.filter((timeline) =>
    installedTimelines.some((installedTimeline) => {
      return (
        timeline.templateTimelineId === installedTimeline.templateTimelineId &&
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        timeline.templateTimelineVersion! > installedTimeline.templateTimelineVersion!
      );
    })
  );
};

export const getTimelinesToInstall = (
  timelinesFromFileSystem: ImportTimelines[],
  installedTimelines: TimelineResponse[]
): ImportTimelines[] => {
  return timelinesFromFileSystem.filter(
    (timeline) =>
      !installedTimelines.some(
        (installedTimeline) => installedTimeline.templateTimelineId === timeline.templateTimelineId
      )
  );
};

export const checkTimelinesStatus = async (
  frameworkRequest: FrameworkRequest,
  filePath?: string,
  fileName?: string
): Promise<InstallPrepackedTimelinesRequestBody | Error> => {
  let readStream;
  let timeline: {
    totalCount: number;
    timeline: TimelineResponse[];
  };
  const dir = resolve(
    join(
      __dirname,
      filePath ?? '../../detection_engine/prebuilt_rules/content/prepackaged_timelines'
    )
  );
  const file = fileName ?? 'index.ndjson';
  const dataPath = path.join(dir, file);

  try {
    readStream = await getReadables(dataPath);
    timeline = await getExistingPrepackagedTimelines(frameworkRequest);
  } catch (err) {
    return {
      timelinesToInstall: [],
      timelinesToUpdate: [],
      prepackagedTimelines: [],
    };
  }

  return loadData<'utf-8', InstallPrepackedTimelinesRequestBody>(
    readStream,
    <T>(timelinesFromFileSystem: T) => {
      if (Array.isArray(timelinesFromFileSystem)) {
        const parsedTimelinesFromFileSystem = (timelinesFromFileSystem as readonly string[]).map(
          (t) => JSON.parse(t)
        );
        const prepackagedTimelines = timeline.timeline ?? [];
        const timelinesToInstall = getTimelinesToInstall(
          parsedTimelinesFromFileSystem,
          prepackagedTimelines
        );
        const timelinesToUpdate = getTimelinesToUpdate(
          parsedTimelinesFromFileSystem,
          prepackagedTimelines
        );

        return Promise.resolve({
          timelinesToInstall,
          timelinesToUpdate,
          prepackagedTimelines,
        });
      } else {
        return Promise.reject(new Error('load timeline error'));
      }
    },
    'utf-8'
  );
};
