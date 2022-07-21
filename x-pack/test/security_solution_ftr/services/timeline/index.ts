/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'superagent';
import { EndpointError } from '@kbn/security-solution-plugin/common/endpoint/errors';
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

  /** Creates a new timeline */
  async createTimeline(title: string) {
    // POST to: http://localhost:5601/api/timeline/_draft
    // with `body`:
    //      {"timelineType":"default"}
    // returns:
    //    {
    //     "persistTimeline": {
    //         "timeline": {
    //             "savedObjectId": "b828e050-0900-11ed-9a0f-f5b386241391",
    //             "version": "WzE0MzgyLDFd",
    //             "columns": [
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "@timestamp"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "message"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "event.category"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "event.action"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "host.name"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "source.ip"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "destination.ip"
    //                 },
    //                 {
    //                     "columnHeaderType": "not-filtered",
    //                     "id": "user.name"
    //                 }
    //             ],
    //             "dataProviders": [],
    //             "description": "",
    //             "eventType": "all",
    //             "filters": [],
    //             "kqlMode": "filter",
    //             "timelineType": "default",
    //             "kqlQuery": {
    //                 "filterQuery": null
    //             },
    //             "title": "",
    //             "sort": [
    //                 {
    //                     "columnId": "@timestamp",
    //                     "sortDirection": "desc"
    //                 }
    //             ],
    //             "status": "draft",
    //             "created": 1658413421269,
    //             "createdBy": "elastic",
    //             "updated": 1658413421269,
    //             "updatedBy": "elastic",
    //             "templateTimelineId": null,
    //             "templateTimelineVersion": null,
    //             "excludedRowRendererIds": [],
    //             "savedQueryId": null,
    //             "dataViewId": null
    //         }
    //     }
    // }
    //
    //
    // PATCH to: http://localhost:5601/api/timeline
    //    This seems to actually set the Title on it and any other query criteria
    //  With `body`:
    //        {
    //     "timeline": {
    //         "columns": [
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "@timestamp",
    //                 "type": "date"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "message"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "event.category"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "event.action"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "host.name"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "source.ip"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "destination.ip"
    //             },
    //             {
    //                 "columnHeaderType": "not-filtered",
    //                 "id": "user.name"
    //             }
    //         ],
    //         "dataProviders": [],
    //         "dataViewId": "security-solution-default",
    //         "description": "",
    //         "eqlOptions": {
    //             "eventCategoryField": "event.category",
    //             "tiebreakerField": "",
    //             "timestampField": "@timestamp",
    //             "query": "",
    //             "size": 100
    //         },
    //         "eventType": "all",
    //         "excludedRowRendererIds": [],
    //         "filters": [],
    //         "kqlMode": "filter",
    //         "kqlQuery": {
    //             "filterQuery": null
    //         },
    //         "indexNames": [
    //             ".alerts-security.alerts-default",
    //             "logs-*"
    //         ],
    //         "title": "test 1",
    //         "timelineType": "default",
    //         "templateTimelineVersion": null,
    //         "templateTimelineId": null,
    //         "dateRange": {
    //             "start": "2022-07-21T04:00:00.000Z",
    //             "end": "2022-07-22T03:59:59.999Z"
    //         },
    //         "savedQueryId": null,
    //         "sort": [
    //             {
    //                 "columnId": "@timestamp",
    //                 "columnType": "date",
    //                 "esTypes": [
    //                     "date"
    //                 ],
    //                 "sortDirection": "desc"
    //             }
    //         ],
    //         "status": "draft"
    //     },
    //     "timelineId": "b828e050-0900-11ed-9a0f-f5b386241391",
    //     "version": "WzE0MzgyLDFd"
    // }
  }

  /** Deletes a timeline using it timeline id */
  async deleteTimeline() {
    // send `DELETE` to: http://localhost:5601/api/timeline
    //    body:
    //    {
    //      "savedObjectIds": [
    //        "b828e050-0900-11ed-9a0f-f5b386241391"
    //     ]
    //    }
    //
    // Response:
    //  {
    //     "data": {
    //         "deleteTimeline": true
    //     }
    // }
    //
  }
}
