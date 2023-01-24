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

  describe('delete_calendars', function () {
    const calendarId = `test_delete_cal`;
    const testCalendar = {
      calendar_id: calendarId,
      job_ids: ['test_job_1', 'test_job_2'],
      description: `Test calendar`,
    };
    const testEvents = [
      { description: 'event 1', start_time: 1513641600000, end_time: 1513728000000 },
      { description: 'event 2', start_time: 1513814400000, end_time: 1513900800000 },
      { description: 'event 3', start_time: 1514160000000, end_time: 1514246400000 },
    ];

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      await ml.api.createCalendar(calendarId, testCalendar);
      await ml.api.createCalendarEvents(calendarId, testEvents);
    });

    afterEach(async () => {
      await ml.api.deleteCalendar(calendarId);
    });

    it('should delete calendar by id', async () => {
      const { body, status } = await supertest
        .delete(`/api/ml/calendars/${calendarId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.acknowledged).to.eql(true);
      await ml.api.waitForCalendarNotToExist(calendarId);
    });

    it('should not delete calendar for user without required permission', async () => {
      const { body, status } = await supertest
        .delete(`/api/ml/calendars/${calendarId}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      await ml.api.waitForCalendarToExist(calendarId);
    });

    it('should not delete calendar for unauthorized user', async () => {
      const { body, status } = await supertest
        .delete(`/api/ml/calendars/${calendarId}`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      await ml.api.waitForCalendarToExist(calendarId);
    });

    it('should return 404 if invalid calendarId', async () => {
      const { body, status } = await supertest
        .delete(`/api/ml/calendars/calendar_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);

      expect(body.error).to.eql('Not Found');
    });
  });
};
