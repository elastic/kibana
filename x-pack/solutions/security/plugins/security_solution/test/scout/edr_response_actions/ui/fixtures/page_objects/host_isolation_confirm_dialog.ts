/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import type { Locator, ScoutPage } from '@kbn/scout-security';
import {
  GET_ISOLATION_SUCCESS_MESSAGE,
  GET_UNISOLATION_SUCCESS_MESSAGE,
} from '../../../../../../public/common/components/endpoint/host_isolation/translations';

/**
 * Confirm-isolation / confirm-release dialog opened as a nested flyout when a user picks
 * "Isolate host" (or "Release host") from the Take action menu on the alert flyout.
 *
 * Success rendering in the alert-flyout flow:
 *  - `HostIsolationFlyout.handleSuccess` fires a success toast (`GET_ISOLATION_SUCCESS_MESSAGE`
 *    or `GET_UNISOLATION_SUCCESS_MESSAGE`) and immediately calls `onClose()`, which unmounts the
 *    nested isolation flyout. The `hostIsolateSuccessCompleteButton` inside the isolation panel
 *    is therefore not observable in this flow — the toast is what surfaces the outcome.
 *  - `hostIsolateSuccessMessage` (used by the legacy Cypress spec) is not part of this flow; it
 *    is rendered by Management → Endpoint hosts view, a different call site.
 */
export class HostIsolationConfirmDialog {
  public readonly flyout: Locator;
  public readonly form: Locator;
  public readonly commentInput: Locator;
  public readonly confirmButton: Locator;
  public readonly toastList: Locator;

  constructor(page: ScoutPage) {
    this.flyout = page.testSubj.locator('securitySolutionFlyoutHostIsolationFlyout');
    this.form = page.testSubj.locator('endpointHostIsolationForm');
    this.commentInput = page.testSubj.locator('host_isolation_comment');
    // The Isolate confirm button has `data-test-subj="hostIsolateConfirmButton"`, but its
    // release counterpart in `unisolate_form.tsx` renders the same `EuiButton` **without any
    // test-subject** (elastic/kibana bug). Fall back to role+name scoped to the flyout so both
    // directions resolve reliably. When the release form gains a `data-test-subj` this can be
    // switched to a testSubj-only lookup.
    this.confirmButton = this.flyout.getByRole('button', { name: 'Confirm', exact: true });
    this.toastList = page.testSubj.locator('globalToastList');
  }

  async waitForForm(): Promise<void> {
    await this.form.waitFor({ state: 'visible' });
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentInput.waitFor({ state: 'visible' });
    await this.commentInput.fill(comment);
  }

  async submitConfirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Verifies the isolate action completed successfully:
   *  - The Kibana success toast reports the exact `GET_ISOLATION_SUCCESS_MESSAGE(hostName)`
   *    copy, and
   *  - The nested isolation flyout is unmounted (`handleSuccess` calls `onClose()`).
   */
  async expectIsolationSuccess(hostName: string): Promise<void> {
    await expect(this.toastList).toContainText(GET_ISOLATION_SUCCESS_MESSAGE(hostName));
    await expect(this.flyout).toBeHidden();
  }

  /** Same as `expectIsolationSuccess` but for the release direction. */
  async expectReleaseSuccess(hostName: string): Promise<void> {
    await expect(this.toastList).toContainText(GET_UNISOLATION_SUCCESS_MESSAGE(hostName));
    await expect(this.flyout).toBeHidden();
  }
}
