/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchScheduleRuleType } from './use_fetch_schedule_rule_type';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { fetchRuleTypes } from '../api';

jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');

const fetchRuleTypesMock = fetchRuleTypes as jest.MockedFunction<typeof fetchRuleTypes>;

describe('useFetchScheduleRuleType', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    fetchRuleTypesMock.mockReturnValue(
      [] as unknown as jest.Mocked<ReturnType<typeof fetchRuleTypes>>
    );
  });

  it('should invoke `addError`', async () => {
    fetchRuleTypesMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useFetchScheduleRuleType(), 'isError');

    expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
      title: 'Failed to fetch attack discovery schedule rule type',
    });
  });

  it('should invoke `fetchRuleTypes`', async () => {
    await renderQuery(() => useFetchScheduleRuleType(), 'isSuccess');

    expect(fetchRuleTypesMock).toHaveBeenCalledWith({ signal: expect.anything() });
  });
});
