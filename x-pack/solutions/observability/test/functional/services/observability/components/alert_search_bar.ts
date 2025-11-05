/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { FtrProviderContext } from '../../../ftr_provider_context';

const FROM_SELECTOR = 'superDatePickerstartDatePopoverButton';
const TO_SELECTOR = 'superDatePickerendDatePopoverButton';

export function ObservabilityAlertSearchBarProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  const getAbsoluteTimeRange = async () => {
    // Since FTR uses UTC, with this format, we remove local browser timezone
    const format = 'YYYY-MM-DDTHH:mm:ss.SSS';

    const fromMoment = dateMath.parse(
      await (await testSubjects.find(FROM_SELECTOR)).getVisibleText()
    );
    const from = fromMoment!.format(format);

    const toMoment = dateMath.parse(await (await testSubjects.find(TO_SELECTOR)).getVisibleText());
    const to = toMoment!.format(format);

    return {
      from,
      to,
    };
  };

  return {
    getAbsoluteTimeRange,
  };
}
