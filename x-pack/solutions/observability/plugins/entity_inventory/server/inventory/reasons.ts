/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const noReadableIndexReason = (indexPattern: string): string =>
  i18n.translate('xpack.entityInventory.reasons.noReadableIndex', {
    defaultMessage: 'no readable index behind "{indexPattern}" maps @timestamp',
    values: { indexPattern },
  });

export const noIdentityCompositionReason = (indexPattern: string, wanted: string): string =>
  i18n.translate('xpack.entityInventory.reasons.noIdentityComposition', {
    defaultMessage:
      'no index behind "{indexPattern}" maps every field of an identity composition ({wanted})',
    values: { indexPattern, wanted },
  });

export const partialRowsReason = (): string =>
  i18n.translate('xpack.entityInventory.reasons.partialRows', {
    defaultMessage:
      'partial result: some shards or clusters did not answer, so rows may be missing',
  });

export const partialValuesReason = (): string =>
  i18n.translate('xpack.entityInventory.reasons.partialValues', {
    defaultMessage:
      'partial result: some shards or clusters did not answer, so values may be missing',
  });
