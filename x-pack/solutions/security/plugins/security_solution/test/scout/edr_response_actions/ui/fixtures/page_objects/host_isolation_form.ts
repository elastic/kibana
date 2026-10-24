/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import type { ActionDetails } from '../../../../../../common/endpoint/types';

/** Isolate and release form opened from the alert Take action menu. */
export class HostIsolationFormPage {
  public readonly form: Locator;
  public readonly comment: Locator;

  constructor(private readonly page: ScoutPage) {
    this.form = this.page.testSubj.locator('endpointHostIsolationForm');
    this.comment = this.page.testSubj.locator('host_isolation_comment');
  }

  async fillComment(comment: string): Promise<void> {
    await this.form.waitFor({ state: 'visible' });
    await this.comment.fill(comment);
  }

  async confirm(): Promise<void> {
    await this.form.getByRole('button', { name: 'Confirm' }).click();
  }

  async waitUntilClosed(): Promise<void> {
    await this.form.waitFor({ state: 'hidden' });
  }
}

interface EndpointActionResponseBody {
  data: ActionDetails;
}

/**
 * Arms a listener for the `POST /api/endpoint/action/<command>` response before `submit`
 * sends the action (Confirm in the isolation form, or the response console submit button), and
 * returns the created action. Fails if the request is not successful.
 */
export const captureEndpointAction = async (
  page: ScoutPage,
  command: 'isolate' | 'unisolate' | 'get_file',
  submit: () => Promise<void>
): Promise<ActionDetails> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes(`/api/endpoint/action/${command}`)
  );
  await submit();
  const response = await responsePromise;
  if (!response.ok()) {
    const responseText = await response.text();
    throw new Error(
      `${command} request failed with ${response.status()}: ${responseText.slice(0, 500)}`
    );
  }
  const body = (await response.json()) as EndpointActionResponseBody;
  return body.data;
};
