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
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
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

    const { savedObjectId: timelineId, version } = createdTimeline;

    const timelineUpdate: TimelineInput = {
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

  /**
   * Get the KQL query that will filter the content of a timeline to display Endpoint alerts
   * @param endpointAgentId
   */
  getEndpointAlertsKqlQuery(endpointAgentId?: string): {
    expression: string;
    esQuery: ReturnType<typeof toElasticsearchQuery>;
  } {
    const expression = [
      'agent.type: "endpoint"',
      'kibana.alert.rule.uuid : *',
      ...(endpointAgentId ? [`agent.id: "${endpointAgentId}"`] : []),
    ].join(' AND ');

    const esQuery = toElasticsearchQuery(fromKueryExpression(expression));

    return {
      expression,
      esQuery,
    };
  }

  /**
   * Crates a new Timeline and sets its `kqlQuery` so that Endpoint Alerts are displayed.
   * Can be limited to an endpoint by providing its `agent.id`
   *
   * @param title
   * @param endpointAgentId
   */
  async createTimelineForEndpointAlerts(
    title: string,
    {
      endpointAgentId,
    }: Partial<{
      /** If defined, then only alerts from the specific `agent.id` will be displayed */
      endpointAgentId: string;
    }>
  ): Promise<TimelineResponse> {
    const newTimeline = await this.createTimeline(title);

    const { expression, esQuery } = this.getEndpointAlertsKqlQuery(endpointAgentId);

    const updatedTimeline = await this.updateTimeline(
      newTimeline.data.persistTimeline.timeline.savedObjectId,
      {
        title,
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression,
            },
            serializedQuery: JSON.stringify(esQuery),
          },
        },
      },
      newTimeline.data.persistTimeline.timeline.version
    );

    return updatedTimeline;
  }
}
