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
import { FtrService } from '../../../functional/ftr_provider_context';

export class TimelineTestService extends FtrService {
  private readonly supertest = this.ctx.getService('supertest');

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

  /** Creates a new timeline */
  async createTimeline(title: string): Promise<TimelineResponse> {
    const {
      savedObjectId: timelineId,
      version,
    } = // Create a new timeline draft
      (
        await this.supertest
          .post(TIMELINE_DRAFT_URL)
          .set('kbn-xsrf', 'true')
          .send({ timelineType: 'default' })
          .then(this.getHttpResponseFailureHandler())
          .then((response) => response.body as TimelineResponse)
      ).data.persistTimeline.timeline;

    const titleUpdate: TimelineInput = {
      title,
    };

    // Update the title
    return this.updateTimeline(timelineId, titleUpdate, version);
  }

  async updateTimeline(
    timelineId: string,
    updates: TimelineInput,
    version: string
  ): Promise<TimelineResponse> {
    return await this.supertest
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
