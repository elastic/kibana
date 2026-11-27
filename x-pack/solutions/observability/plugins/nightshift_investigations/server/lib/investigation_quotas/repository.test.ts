/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_INVESTIGATION_QUOTA_SETTINGS } from '../../../common/investigation_quotas';
import {
  NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
  NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID,
  NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
} from '../../saved_objects';
import {
  applyInvestigationQuotaSettingsUpdate,
  getInvestigationQuotaLedgerId,
  mutateInvestigationQuotaLedger,
  readInvestigationQuotaLedger,
  readInvestigationQuotaSettings,
  updateInvestigationQuotaSettings,
} from './repository';
import { createInvestigationQuotaRepositoryMock } from './repository.mock';

describe('investigation quota settings', () => {
  it('reads the defaults when nothing is stored', async () => {
    const { client } = createInvestigationQuotaRepositoryMock();

    await expect(readInvestigationQuotaSettings(client)).resolves.toEqual(
      DEFAULT_INVESTIGATION_QUOTA_SETTINGS
    );
  });

  it('merges an update into the defaults on first write', async () => {
    const { client } = createInvestigationQuotaRepositoryMock();

    await expect(
      updateInvestigationQuotaSettings(client, { limits: { manual_investigation: 7 } })
    ).resolves.toEqual({
      enabled: true,
      limits: { automatic_investigation: 5, manual_investigation: 7, total_investigation: 10 },
    });
  });

  it('reports the settings an update replaced along with the ones it wrote', async () => {
    const { client } = createInvestigationQuotaRepositoryMock();

    const first = await applyInvestigationQuotaSettingsUpdate(client, {
      limits: { manual_investigation: 7 },
    });
    const second = await applyInvestigationQuotaSettingsUpdate(client, {
      enabled: false,
      limits: { manual_investigation: null },
    });

    // With nothing stored yet, the settings replaced are the defaults.
    expect(first.previous).toEqual(DEFAULT_INVESTIGATION_QUOTA_SETTINGS);
    expect(first.next.limits.manual_investigation).toBe(7);
    expect(second.previous).toEqual(first.next);
    expect(second.next).toEqual({
      enabled: false,
      limits: { automatic_investigation: 5, manual_investigation: null, total_investigation: 10 },
    });
  });

  it('keeps a limit that is unlimited as unlimited instead of restoring its default', async () => {
    const { client } = createInvestigationQuotaRepositoryMock();
    await updateInvestigationQuotaSettings(client, {
      limits: { automatic_investigation: null },
    });

    await updateInvestigationQuotaSettings(client, { limits: { manual_investigation: 3 } });

    await expect(readInvestigationQuotaSettings(client)).resolves.toEqual({
      enabled: true,
      limits: { automatic_investigation: null, manual_investigation: 3, total_investigation: 10 },
    });
  });

  it('keeps the limits when enforcement is turned off and on', async () => {
    const { client } = createInvestigationQuotaRepositoryMock();
    await updateInvestigationQuotaSettings(client, { limits: { total_investigation: 4 } });

    await updateInvestigationQuotaSettings(client, { enabled: false });
    await expect(readInvestigationQuotaSettings(client)).resolves.toMatchObject({
      enabled: false,
      limits: { total_investigation: 4 },
    });

    await updateInvestigationQuotaSettings(client, { enabled: true });
    await expect(readInvestigationQuotaSettings(client)).resolves.toMatchObject({
      enabled: true,
      limits: { total_investigation: 4 },
    });
  });

  it('retries on a conflict and applies the update to the latest settings', async () => {
    const repository = createInvestigationQuotaRepositoryMock();
    await updateInvestigationQuotaSettings(repository.client, {
      limits: { manual_investigation: 2 },
    });
    // A concurrent writer changes the settings between this update's read and its write.
    const update = repository.client.update;
    let conflicted = false;
    const racing = {
      ...repository.client,
      update: async (...args: Parameters<typeof update>) => {
        if (!conflicted) {
          conflicted = true;
          await update(
            NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
            NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID,
            { enabled: false },
            { version: '1' }
          );
        }
        return update(...args);
      },
    };

    await expect(
      updateInvestigationQuotaSettings(racing, { limits: { total_investigation: 9 } })
    ).resolves.toEqual({
      enabled: false,
      limits: { automatic_investigation: 5, manual_investigation: 2, total_investigation: 9 },
    });
  });

  it('propagates read failures other than not found', async () => {
    const repository = createInvestigationQuotaRepositoryMock();
    repository.failNextGet(new Error('settings unavailable'));

    await expect(readInvestigationQuotaSettings(repository.client)).rejects.toThrow(
      'settings unavailable'
    );
  });
});

describe('investigation quota ledger', () => {
  it('reads an empty ledger when nothing is stored', async () => {
    const { client } = createInvestigationQuotaRepositoryMock();

    await expect(
      readInvestigationQuotaLedger(client, '2026-08-31', 'manual_investigation')
    ).resolves.toEqual({ date: '2026-08-31', group: 'manual_investigation', count: 0 });
  });

  it('puts the date and group in the saved object id', () => {
    expect(getInvestigationQuotaLedgerId('2026-08-31', 'automatic_investigation')).toBe(
      '2026-08-31-automatic_investigation'
    );
  });

  it('increments counts beyond 10,000', async () => {
    const repository = createInvestigationQuotaRepositoryMock();
    repository.seedLedger('2026-08-31', 'manual_investigation', 10_000);

    await mutateInvestigationQuotaLedger({
      repository: repository.client,
      date: '2026-08-31',
      group: 'manual_investigation',
      mutation: (ledger) => ({ count: ledger.count + 1, result: undefined }),
    });

    await expect(repository.count('2026-08-31', 'manual_investigation')).resolves.toBe(10_001);
  });

  it('writes under the date it was given when a conflict is retried across midnight', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T23:59:59.999Z'));
    const repository = createInvestigationQuotaRepositoryMock();
    repository.onNextCreate((type, id) => {
      jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
      expect(type).toBe(NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE);
      expect(id).toBe(getInvestigationQuotaLedgerId('2026-08-31', 'manual_investigation'));
      repository.seedLedger('2026-08-31', 'manual_investigation', 0);
    });

    await mutateInvestigationQuotaLedger({
      repository: repository.client,
      date: '2026-08-31',
      group: 'manual_investigation',
      mutation: (ledger) => ({ count: ledger.count + 1, result: undefined }),
    });

    await expect(repository.count('2026-08-31', 'manual_investigation')).resolves.toBe(1);
    await expect(repository.count('2026-09-01', 'manual_investigation')).resolves.toBe(0);
    jest.useRealTimers();
  });

  it('propagates write failures other than a conflict', async () => {
    const repository = createInvestigationQuotaRepositoryMock();
    repository.failNextCreate(SavedObjectsErrorHelpers.decorateGeneralError(new Error('boom')));

    await expect(
      mutateInvestigationQuotaLedger({
        repository: repository.client,
        date: '2026-08-31',
        group: 'manual_investigation',
        mutation: (ledger) => ({ count: ledger.count + 1, result: undefined }),
      })
    ).rejects.toThrow('boom');
  });
});
