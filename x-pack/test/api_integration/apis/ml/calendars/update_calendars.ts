/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('update_calendars', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    const calendarId = `test_update_cal`;
    const originalCalendar = {
      calendar_id: calendarId,
      job_ids: ['test_job_1'],
      description: `Test calendar`,
    };
    const originalEvents = [
      { description: 'event 1', start_time: 1513641600000, end_time: 1513728000000 },
    ];

    const updateCalendarRequestBody = {
      calendarId,
      job_ids: ['test_updated_job_1', 'test_updated_job_2'],
      description: 'Updated calendar #1',
      events: [
        { description: 'updated event 2', start_time: 1513814400000, end_time: 1513900800000 },
        { description: 'updated event 3', start_time: 1514160000000, end_time: 1514246400000 },
      ],
    };

    beforeEach(async () => {
      await ml.api.createCalendar(calendarId, originalCalendar);
      await ml.api.createCalendarEvents(calendarId, originalEvents);
    });

    afterEach(async () => {
      await ml.api.deleteCalendar(calendarId);
    });

    it('should update calendar by id with new settings', async () => {
      await supertest
        .put(`/api/ml/calendars/${calendarId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateCalendarRequestBody)
        .expect(200);

      await ml.api.waitForCalendarToExist(calendarId);

      const getCalendarResult = await ml.api.getCalendar(calendarId);
      const getEventsResult = await ml.api.getCalendarEvents(calendarId);

      const updatedCalendar = getCalendarResult.body.calendars[0];
      const updatedEvents = getEventsResult.body.events;

      expect(updatedCalendar.calendar_id).to.eql(updateCalendarRequestBody.calendarId);
      expect(updatedCalendar.job_ids).to.have.length(updateCalendarRequestBody.job_ids.length);
      expect(updatedEvents).to.have.length(updateCalendarRequestBody.events.length);
      await ml.api.waitForEventsToExistInCalendar(
        updatedCalendar.calendar_id,
        updateCalendarRequestBody.events
      );
    });

    it('should not allow to update calendar for user without required permission ', async () => {
      await supertest
        .put(`/api/ml/calendars/${calendarId}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateCalendarRequestBody)
        .expect(404);
    });

    it('should not allow to update calendar for unauthorized user', async () => {
      await supertest
        .put(`/api/ml/calendars/${calendarId}`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateCalendarRequestBody)
        .expect(404);
    });

    it('should return error if invalid calendarId ', async () => {
      await supertest
        .put(`/api/ml/calendars/calendar_id_dne`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateCalendarRequestBody)
        .expect(404);
    });
  });
};
