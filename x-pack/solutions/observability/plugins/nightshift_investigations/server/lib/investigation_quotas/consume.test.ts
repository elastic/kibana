/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InvestigationQuotasUpdate } from '../../../common/investigation_quotas';
import { consumeInvestigationQuota, releaseInvestigationQuota } from './consume';
import { getInvestigationQuotaLedgerId, updateInvestigationQuotaSettings } from './repository';
import { createInvestigationQuotaRepositoryMock } from './repository.mock';

const date = '2026-08-31';

const setup = async (settings: InvestigationQuotasUpdate) => {
  const repository = createInvestigationQuotaRepositoryMock();
  await updateInvestigationQuotaSettings(repository.client, settings);
  const logger = loggingSystemMock.createLogger();
  const consume = (trigger: 'automatic' | 'manual') =>
    consumeInvestigationQuota({ repository: repository.client, trigger, date, logger });
  const counts = async () => ({
    automatic: await repository.count(date, 'automatic_investigation'),
    manual: await repository.count(date, 'manual_investigation'),
    total: await repository.count(date, 'total_investigation'),
  });
  return { repository, consume, counts, logger };
};

describe('consumeInvestigationQuota', () => {
  it('charges the trigger limit and the total, and gives both back on release', async () => {
    const { consume, counts } = await setup({
      limits: { manual_investigation: 5, total_investigation: 5 },
    });

    const result = await consume('manual');

    expect(await counts()).toEqual({ automatic: 0, manual: 1, total: 1 });
    if (!result.allowed) throw new Error('Expected the start to be allowed');
    await result.release?.();
    expect(await counts()).toEqual({ automatic: 0, manual: 0, total: 0 });
  });

  it('charges automatic starts to the automatic limit', async () => {
    const { consume, counts } = await setup({});

    await consume('automatic');

    expect(await counts()).toEqual({ automatic: 1, manual: 0, total: 1 });
  });

  it('denies at the trigger limit without charging the total', async () => {
    const { consume, counts } = await setup({
      limits: { manual_investigation: 1, total_investigation: 10 },
    });
    await consume('manual');

    await expect(consume('manual')).resolves.toEqual({
      allowed: false,
      deniedBy: 'manual',
      limit: 1,
    });
    expect(await counts()).toEqual({ automatic: 0, manual: 1, total: 1 });
  });

  it('denies at the total limit without charging the trigger limit', async () => {
    const { consume, counts } = await setup({
      limits: { automatic_investigation: 5, manual_investigation: 5, total_investigation: 2 },
    });
    await consume('automatic');
    await consume('manual');

    await expect(consume('manual')).resolves.toEqual({
      allowed: false,
      deniedBy: 'all',
      limit: 2,
    });
    expect(await counts()).toEqual({ automatic: 1, manual: 1, total: 2 });
  });

  it('counts starts past the limits while the limits are not enforced', async () => {
    const { consume, counts } = await setup({
      enabled: false,
      limits: { automatic_investigation: 1, total_investigation: 1 },
    });

    for (const attempt of [1, 2]) {
      await expect(consume('automatic')).resolves.toMatchObject({ allowed: true });
      expect(await counts()).toEqual({ automatic: attempt, manual: 0, total: attempt });
    }
  });

  it('allows and counts every start when a limit is unlimited, even concurrently', async () => {
    const { consume, counts } = await setup({
      limits: {
        automatic_investigation: null,
        manual_investigation: null,
        total_investigation: null,
      },
    });

    const results = await Promise.all(Array.from({ length: 30 }, () => consume('manual')));

    expect(results.every(({ allowed }) => allowed)).toBe(true);
    expect(await counts()).toEqual({ automatic: 0, manual: 30, total: 30 });
  });

  it('never over-grants concurrent starts competing for the final slot', async () => {
    const { consume, counts } = await setup({
      limits: { manual_investigation: 1, total_investigation: 10 },
    });

    const results = await Promise.all(Array.from({ length: 30 }, () => consume('manual')));

    expect(results.filter(({ allowed }) => allowed)).toHaveLength(1);
    expect(await counts()).toEqual({ automatic: 0, manual: 1, total: 1 });
  });

  it('releases the trigger limit even when releasing the total fails', async () => {
    const { repository, consume, counts } = await setup({
      limits: { manual_investigation: 5, total_investigation: 5 },
    });
    const result = await consume('manual');
    if (!result.allowed) throw new Error('Expected the start to be allowed');
    repository.failNextUpdateOf(
      getInvestigationQuotaLedgerId(date, 'total_investigation'),
      new Error('total ledger unavailable')
    );

    await expect(result.release?.()).rejects.toThrow('total ledger unavailable');
    expect(await counts()).toEqual({ automatic: 0, manual: 0, total: 1 });
  });

  it('gives the trigger limit back when charging the total fails', async () => {
    const { repository, consume, counts } = await setup({
      limits: { manual_investigation: 5, total_investigation: 5 },
    });
    // The first start creates both ledgers, so the next one updates them.
    await consume('manual');
    repository.failNextUpdateOf(
      getInvestigationQuotaLedgerId(date, 'total_investigation'),
      new Error('total ledger unavailable')
    );

    await expect(consume('manual')).rejects.toThrow('total ledger unavailable');
    expect(await counts()).toEqual({ automatic: 0, manual: 1, total: 1 });
  });

  it('propagates settings read failures without charging anything', async () => {
    const { repository, consume, counts } = await setup({});
    repository.failNextGet(new Error('settings unavailable'));

    await expect(consume('manual')).rejects.toThrow('settings unavailable');
    expect(await counts()).toEqual({ automatic: 0, manual: 0, total: 0 });
  });
});

describe('consumeInvestigationQuota logging', () => {
  it('logs a charge with the counts before and after and the limits', async () => {
    const { consume, logger } = await setup({
      limits: { manual_investigation: 5, total_investigation: 5 },
    });
    await consume('manual');
    await consume('manual');

    expect(logger.info.mock.calls).toEqual([
      [
        'Investigation quota charged for a manual start: manual_investigation 0 -> 1 of 5, total_investigation 0 -> 1 of 5',
      ],
      [
        'Investigation quota charged for a manual start: manual_investigation 1 -> 2 of 5, total_investigation 1 -> 2 of 5',
      ],
    ]);
  });

  it('says when a limit is unlimited and when the limits are not enforced', async () => {
    const { consume, logger } = await setup({
      enabled: false,
      limits: { automatic_investigation: null },
    });

    await consume('automatic');

    expect(logger.info).toHaveBeenCalledWith(
      'Investigation quota charged for an automatic start: automatic_investigation 0 -> 1 of unlimited, total_investigation 0 -> 1 of 10 (limits not enforced)'
    );
  });

  it('logs a denial by the trigger limit, with the limit and the current count, and no charge', async () => {
    const { consume, logger } = await setup({
      limits: { manual_investigation: 1, total_investigation: 10 },
    });
    await consume('manual');
    logger.info.mockClear();

    await consume('manual');

    expect(logger.info.mock.calls).toEqual([
      [
        'Investigation quota denied a manual start: manual_investigation is at its limit of 1 (count 1)',
      ],
    ]);
  });

  it('logs a denial by the total limit once, without logging the charge it rolled back', async () => {
    const { consume, logger } = await setup({
      limits: { automatic_investigation: 5, manual_investigation: 5, total_investigation: 1 },
    });
    await consume('automatic');
    logger.info.mockClear();

    await consume('manual');

    expect(logger.info.mock.calls).toEqual([
      [
        'Investigation quota denied a manual start: total_investigation is at its limit of 1 (count 1)',
      ],
    ]);
  });

  it('logs a release with the counts before and after, and says when a count is already 0', async () => {
    const { consume, logger } = await setup({
      limits: { manual_investigation: 5, total_investigation: 5 },
    });
    const result = await consume('manual');
    if (!result.allowed) throw new Error('Expected the start to be allowed');
    logger.info.mockClear();

    await result.release?.();
    await result.release?.();

    expect(logger.info.mock.calls).toEqual([
      [
        'Investigation quota released for a manual start: manual_investigation 1 -> 0, total_investigation 1 -> 0',
      ],
      [
        'Investigation quota released for a manual start: manual_investigation already at 0, total_investigation already at 0',
      ],
    ]);
  });
});

describe('releaseInvestigationQuota', () => {
  it('does not go below zero', async () => {
    const { repository, consume } = await setup({});
    await consume('manual');

    const release = () =>
      releaseInvestigationQuota({
        repository: repository.client,
        group: 'manual_investigation',
        date,
      });
    await release();
    await release();

    await expect(repository.count(date, 'manual_investigation')).resolves.toBe(0);
  });
});
