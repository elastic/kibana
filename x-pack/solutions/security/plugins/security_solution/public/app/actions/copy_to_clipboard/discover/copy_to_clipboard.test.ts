/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCopyToClipboardDiscoverCellActionFactory } from './copy_to_clipboard';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { BehaviorSubject } from 'rxjs';
import { APP_UI_ID } from '../../../../../common';

const services = createStartServicesMock();
const mockSuccessToast = services.notifications.toasts.addSuccess;

const currentAppIdSubject$ = new BehaviorSubject<string>(APP_UI_ID);
services.application.currentAppId$ = currentAppIdSubject$.asObservable();

const mockCopy = jest.fn((text: string) => true);
jest.mock('copy-to-clipboard', () => (text: string) => mockCopy(text));

describe('createCopyToClipboardDiscoverCellActionFactory', () => {
  const copyToClipboardActionFactory = createCopyToClipboardDiscoverCellActionFactory({ services });
  const copyToClipboardAction = copyToClipboardActionFactory({ id: 'testAction' });
  const context = {
    data: [
      {
        field: { name: 'user.name', type: 'string' },
        value: 'the value',
      },
    ],
  } as CellActionExecutionContext;

  beforeEach(() => {
    currentAppIdSubject$.next(APP_UI_ID);
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(copyToClipboardAction.getDisplayName(context)).toEqual('Copy to clipboard');
  });

  it('should return icon type', () => {
    expect(copyToClipboardAction.getIconType(context)).toEqual('copyClipboard');
  });

  describe('isCompatible', () => {
    it('should return true if everything is okay', async () => {
      expect(await copyToClipboardAction.isCompatible(context)).toEqual(true);
    });

    it('should return false if not in security', async () => {
      currentAppIdSubject$.next('not-security');
      expect(await copyToClipboardAction.isCompatible(context)).toEqual(false);
    });

    it('should return false if field not allowed', async () => {
      expect(
        await copyToClipboardAction.isCompatible({
          ...context,
          data: [
            {
              ...context.data[0],
              field: { ...context.data[0].field, name: 'signal.reason' },
            },
          ],
        })
      ).toEqual(false);
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await copyToClipboardAction.execute(context);
      expect(mockCopy).toHaveBeenCalledWith('user.name: "the value"');
      expect(mockSuccessToast).toHaveBeenCalled();
    });
  });
});
