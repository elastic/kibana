/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'superagent';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
import { TIMELINE_DRAFT_URL, TIMELINE_URL } from '@kbn/security-solution-plugin/common/constants';
import { TimelineResponse } from '@kbn/security-solution-plugin/common/types';
import { TimelineInput } from '@kbn/security-solution-plugin/common/search_strategy';
import moment from 'moment';
import { FtrService } from '../../../functional/ftr_provider_context';

export class TimelineTestService extends FtrService {
  private readonly supertest = this.ctx.getService('supertest');
  private readonly log = this.ctx.getService('log');

  /**
   * Returns an error handler for `supertest` request that will dump out more useful information
   * when things fail.
   *
   * @param ignoredStatusCodes
   * @private
   *
   * @example
   *
   * await this.supertest
   *    .post('/some/api')
   *    .set('kbn-xsrf', 'true')
   *    .send(somePayLoad)
   *    .then(this.getHttpResponseFailureHandler([409]));
   */
  private getHttpResponseFailureHandler(
    ignoredStatusCodes: number[] = []
  ): (res: Response) => Promise<Response> {
    return async (res) => {
      if (!res.ok && !ignoredStatusCodes.includes(res.status)) {
        throw new EndpointError(JSON.stringify(res.error, null, 2));
      }

      return res;
    };
  }

  /**
   * Creates a new timeline.
   *
   * Note: Although the timeline is created, when displayed on the UI, no events are retrieved
   * for display (not sure why). TO get around this, just select a date range from the user date
   * picker and that seems to trigger the events to be fetched.
   */
  async createTimeline(title: string): Promise<TimelineResponse> {
    // Create a new timeline draft
    const createdTimeline = (
      await this.supertest
        .post(TIMELINE_DRAFT_URL)
        .set('kbn-xsrf', 'true')
        .send({ timelineType: 'default' })
        .then(this.getHttpResponseFailureHandler())
        .then((response) => response.body as TimelineResponse)
    ).data.persistTimeline.timeline;

    this.log.info('Draft timeline:');
    this.log.indent(4, () => {
      this.log.info(JSON.stringify(createdTimeline));
    });

    const { savedObjectId: timelineId, version, ...timelineDoc } = createdTimeline;

    const timelineUpdate: TimelineInput = {
      ...(timelineDoc as TimelineInput),
      title,
      // Set date range to the last 1 year
      dateRange: {
        start: moment().subtract(1, 'year').toISOString(),
        end: moment().toISOString(),
        // Not sure why `start`/`end` are defined as numbers in the type, but looking at the
        // UI's use of it, I can see they are being set to strings, so I'm forcing a cast here
      } as unknown as TimelineInput['dateRange'],

      // Not sure why, but the following fields are not in the created timeline, which causes
      // the timeline to not be able to pull in the event for display
      indexNames: [],
      eqlOptions: {
        tiebreakerField: '',
        size: 100,
        query: '',
        eventCategoryField: 'event.category',
        timestampField: '@timestamp',
      },
    };

    // Update the timeline
    const updatedTimelineResponse = await this.updateTimeline(timelineId, timelineUpdate, version);

    this.log.info('Created timeline:');
    this.log.indent(4, () => {
      this.log.info(JSON.stringify(updatedTimelineResponse));
    });

    return updatedTimelineResponse;
  }

  async updateTimeline(
    timelineId: string,
    updates: TimelineInput,
    version: string
  ): Promise<TimelineResponse> {
    return await this.supertest
      // DEV NOTE/FYI:
      // Although this API is a `patch`, it does not seem that it actually does a patch,
      // so `updates` should always be the full timeline record
      .patch(TIMELINE_URL)
      .set('kbn-xsrf', 'true')
      .send({
        timelineId,
        version,
        timeline: updates,
      })
      .then(this.getHttpResponseFailureHandler())
      .then((response) => response.body as TimelineResponse);
  }

  /** Deletes a timeline using it timeline id */
  async deleteTimeline(id: string | string[]): Promise<void> {
    await this.supertest
      .delete(TIMELINE_URL)
      .set('kbn-xsrf', 'true')
      .send({
        savedObjectIds: Array.isArray(id) ? id : [id],
      })
      .then(this.getHttpResponseFailureHandler())
      .then((response) => response.body as TimelineResponse);
  }
}
