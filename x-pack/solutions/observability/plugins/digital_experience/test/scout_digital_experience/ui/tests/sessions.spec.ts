/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  DETAILED_SESSION,
  FIREFOX_SESSIONS,
  SESSION_COUNT,
  SESSIONS_APP,
  SESSIONS_TIME_RANGE,
  SESSIONS_WITH_ERRORS,
} from '../../common/fixtures/sessions_data';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

test.describe('Digital Experience sessions', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('opens the Sessions tab of an EDOT Browser application, keeping the time range', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoApplications();
    await digitalExperience.applicationLink(SESSIONS_APP).click();
    await digitalExperience.sessionsTab.click();

    await expect(digitalExperience.sessionsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(`/${SESSIONS_APP}/sessions\\?`));
    await expect(digitalExperience.breadcrumbs).toContainText('Sessions');
    // The list's 2021 range, before the mock sessions: the tab explains how sessions get there.
    await expect(digitalExperience.sessionsEmpty).toContainText('session.id');
  });

  test('filters, searches and pages through the sessions', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoSessions(SESSIONS_APP, { perPage: '10' }, SESSIONS_TIME_RANGE);
    await expect(digitalExperience.sessionsKpi('total')).toContainText(String(SESSION_COUNT));

    await test.step('pages through the sessions', async () => {
      await expect(digitalExperience.sessionsTable.rows).toHaveCount(10);
      await digitalExperience.gotoSessionsPage(2);
      await expect(digitalExperience.sessionsTable.rows).toHaveCount(SESSION_COUNT - 10);
      await expect(page).toHaveURL(/page=1/);
    });

    await test.step('keeps the sessions with errors, from the first page', async () => {
      await digitalExperience.sessionsErrorsFilter.click();

      await expect(digitalExperience.sessionsTable.rows).toHaveCount(SESSIONS_WITH_ERRORS);
      await expect(digitalExperience.sessionsKpi('total')).toContainText(
        String(SESSIONS_WITH_ERRORS)
      );
      await expect(page).toHaveURL(/hasErrors=true/);
      await expect(page).not.toHaveURL(/page=/);
    });

    await test.step('narrows to a browser', async () => {
      await digitalExperience.sessionsClearFilters.click();
      await digitalExperience.selectSessionsFacet('browser', 'Firefox');

      await expect(digitalExperience.sessionsTable.rows).toHaveCount(FIREFOX_SESSIONS);
      await expect(page).toHaveURL(/browser=Firefox/);
    });

    await test.step('finds a session by its user', async () => {
      await digitalExperience.sessionsClearFilters.click();
      await digitalExperience.sessionsSearch.fill('jane');

      await expect(digitalExperience.sessionsTable.rows).toHaveCount(1);
      await expect(digitalExperience.sessionRow(DETAILED_SESSION.id)).toContainText(
        DETAILED_SESSION.user
      );
      await expect(page).toHaveURL(/search=jane/);
    });
  });

  test('opens a session with its waterfall, then goes back to the same list', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoSessions(SESSIONS_APP, { hasErrors: 'true' }, SESSIONS_TIME_RANGE);
    await digitalExperience.sessionLink(DETAILED_SESSION.id).click();

    await test.step('summarizes the session', async () => {
      await expect(digitalExperience.sessionSummary).toContainText(DETAILED_SESSION.user);
      await expect(page.getByTestId('digitalExperienceSessionId')).toHaveText(DETAILED_SESSION.id);
    });

    await test.step('draws a segment per page visit and marks the error', async () => {
      await expect(digitalExperience.sessionWaterfallSegments).toHaveCount(
        DETAILED_SESSION.pages.length
      );
      await expect(digitalExperience.sessionWaterfallErrors).toHaveCount(1);
    });

    await test.step('goes back to the list with its filters and time range', async () => {
      await digitalExperience.breadcrumbLink('Sessions').click();

      await expect(page).toHaveURL(/hasErrors=true/);
      await expect(page).toHaveURL(
        new RegExp(`rangeFrom=${encodeURIComponent(SESSIONS_TIME_RANGE.rangeFrom)}`)
      );
      await expect(digitalExperience.sessionsTable.rows).toHaveCount(SESSIONS_WITH_ERRORS);
    });
  });
});
