/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('get_calendars', function () {
    const testEvents = [
      { description: 'event 1', start_time: 1513641600000, end_time: 1513728000000 },
      { description: 'event 2', start_time: 1513814400000, end_time: 1513900800000 },
      { description: 'event 3', start_time: 1514160000000, end_time: 1514246400000 },
    ];

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    describe('get multiple calendars', function () {
      const testCalendars = [1, 2, 3].map((num) => ({
        calendar_id: `test_get_cal_${num}`,
        job_ids: ['test_job_1', 'test_job_2'],
        description: `Test calendar ${num}`,
      }));

      beforeEach(async () => {
        for (const testCalendar of testCalendars) {
          await ml.api.createCalendar(testCalendar.calendar_id, testCalendar);
          await ml.api.createCalendarEvents(testCalendar.calendar_id, testEvents);
        }
      });

      afterEach(async () => {
        for (const testCalendar of testCalendars) {
          await ml.api.deleteCalendar(testCalendar.calendar_id);
        }
      });

      it('should fetch all calendars', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/calendars`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body).to.have.length(testCalendars.length);
        expect(body[0].events).to.have.length(testEvents.length);
        ml.api.assertAllEventsExistInCalendar(testEvents, body[0]);
      });

      it('should fetch all calendars for user with view permission', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/calendars`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body).to.have.length(testCalendars.length);
        expect(body[0].events).to.have.length(testEvents.length);
        ml.api.assertAllEventsExistInCalendar(testEvents, body[0]);
      });

      it('should not fetch calendars for unauthorized user', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/calendars`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
      });
    });

    describe('get calendar by id', function () {
      const calendarId = `test_get_cal`;
      const testCalendar = {
        calendar_id: calendarId,
        job_ids: ['test_job_1', 'test_job_2'],
        description: `Test calendar`,
      };

      beforeEach(async () => {
        await ml.api.createCalendar(calendarId, testCalendar);
        await ml.api.createCalendarEvents(calendarId, testEvents);
      });

      afterEach(async () => {
        await ml.api.deleteCalendar(calendarId);
      });

      it('should fetch calendar & associated events by id', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/calendars/${calendarId}`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.job_ids).to.eql(testCalendar.job_ids);
        expect(body.description).to.eql(testCalendar.description);
        expect(body.events).to.have.length(testEvents.length);
        ml.api.assertAllEventsExistInCalendar(testEvents, body);
      });

      it('should fetch calendar & associated events by id for user with view permission', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/calendars/${calendarId}`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.job_ids).to.eql(testCalendar.job_ids);
        expect(body.description).to.eql(testCalendar.description);
        expect(body.events).to.have.length(testEvents.length);
        ml.api.assertAllEventsExistInCalendar(testEvents, body);
      });

      it('should not fetch calendars for unauthorized user', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/calendars/${calendarId}`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
      });
    });

    it('should return 404 if invalid calendar id', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/calendars/calendar_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);

      expect(body.error).to.eql('Not Found');
    });
  });
};
