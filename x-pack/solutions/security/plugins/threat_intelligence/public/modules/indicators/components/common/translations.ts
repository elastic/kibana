/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/* Copy To Clipboard */
export const COPY_TITLE = i18n.translate(
  'xpack.threatIntelligence.indicators.table.copyToClipboardLabel',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

/* Field Label */

export const TIMESTAMP = i18n.translate('xpack.threatIntelligence.field.@timestamp', {
  defaultMessage: '@timestamp',
});

export const INDICATORS = i18n.translate('xpack.threatIntelligence.field.threat.indicator.name', {
  defaultMessage: 'Indicator',
});

export const TYPE = i18n.translate('xpack.threatIntelligence.field.threat.indicator.type', {
  defaultMessage: 'Indicator type',
});

export const FEED = i18n.translate('xpack.threatIntelligence.field.threat.feed.name', {
  defaultMessage: 'Feed',
});

export const FIRST_SEEN = i18n.translate(
  'xpack.threatIntelligence.field.threat.indicator.first_seen',
  {
    defaultMessage: 'First seen',
  }
);

export const LAST_SEEN = i18n.translate(
  'xpack.threatIntelligence.field.threat.indicator.last_seen',
  {
    defaultMessage: 'Last seen',
  }
);

export const CONFIDENCE = i18n.translate(
  'xpack.threatIntelligence.field.threat.indicator.confidence',
  {
    defaultMessage: 'Confidence',
  }
);

export const TLP_MARKETING = i18n.translate(
  'xpack.threatIntelligence.field.threat.indicator.marking.tlp',
  {
    defaultMessage: 'TLP Marking',
  }
);
