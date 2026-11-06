/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OK = i18n.translate('xpack.synthetics.certs.ok', {
  defaultMessage: 'OK',
});

export const EXPIRED = i18n.translate('xpack.synthetics.certs.expired', {
  defaultMessage: 'Expired',
});

export const EXPIRES_SOON = i18n.translate('xpack.synthetics.certs.expireSoon', {
  defaultMessage: 'Expires soon',
});

export const EXPIRES = i18n.translate('xpack.synthetics.certs.expires', {
  defaultMessage: 'Expires',
});

export const SEARCH_CERTS = i18n.translate('xpack.synthetics.certs.searchCerts', {
  defaultMessage: 'Search certificates',
});

export const MONITOR_TYPE_FILTER = i18n.translate('xpack.synthetics.certs.monitorTypeFilter', {
  defaultMessage: 'Monitor type',
});

export const MONITOR_TYPE_FILTER_HTTP = i18n.translate(
  'xpack.synthetics.certs.monitorTypeFilter.http',
  {
    defaultMessage: 'HTTP',
  }
);

export const MONITOR_TYPE_FILTER_TCP = i18n.translate(
  'xpack.synthetics.certs.monitorTypeFilter.tcp',
  {
    defaultMessage: 'TCP',
  }
);

export const MONITOR_TYPE_FILTER_BROWSER = i18n.translate(
  'xpack.synthetics.certs.monitorTypeFilter.browser',
  {
    defaultMessage: 'Browser',
  }
);

export const RESOURCE_TYPE_FILTER = i18n.translate('xpack.synthetics.certs.resourceTypeFilter', {
  defaultMessage: 'Resource type',
});

export const PARTY_FILTER = i18n.translate('xpack.synthetics.certs.partyFilter', {
  defaultMessage: 'Origin',
});

export const PARTY_FILTER_FIRST = i18n.translate('xpack.synthetics.certs.partyFilter.firstParty', {
  defaultMessage: 'First-party',
});

export const PARTY_FILTER_THIRD = i18n.translate('xpack.synthetics.certs.partyFilter.thirdParty', {
  defaultMessage: 'Third-party',
});

export const BROWSER_FILTER_DISABLED_TOOLTIP = i18n.translate(
  'xpack.synthetics.certs.browserFilterDisabledTooltip',
  {
    defaultMessage: 'Available only when browser monitors are included.',
  }
);

export const PARTY_FILTER_FIRST_TOOLTIP = i18n.translate(
  'xpack.synthetics.certs.partyFilter.firstParty.tooltip',
  {
    defaultMessage: 'Served from the same site as the monitored URL.',
  }
);

export const PARTY_FILTER_THIRD_TOOLTIP = i18n.translate(
  'xpack.synthetics.certs.partyFilter.thirdParty.tooltip',
  {
    defaultMessage:
      'Served from an external domain the page loads, such as a CDN, analytics, or ads.',
  }
);

// Resource categories are derived from the response content type
// (`http.response.mime_type`), matching the step waterfall's resource taxonomy.
export const RESOURCE_TYPE_TOOLTIP_HTML = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.html.tooltip',
  {
    defaultMessage: 'HTML documents (text/html).',
  }
);

export const RESOURCE_TYPE_TOOLTIP_SCRIPT = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.script.tooltip',
  {
    defaultMessage: 'JavaScript files.',
  }
);

export const RESOURCE_TYPE_TOOLTIP_STYLESHEET = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.stylesheet.tooltip',
  {
    defaultMessage: 'CSS stylesheets.',
  }
);

export const RESOURCE_TYPE_TOOLTIP_IMAGE = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.image.tooltip',
  {
    defaultMessage: 'Images such as PNG, JPG, or SVG files.',
  }
);

export const RESOURCE_TYPE_TOOLTIP_FONT = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.font.tooltip',
  {
    defaultMessage: 'Web font files.',
  }
);

export const RESOURCE_TYPE_TOOLTIP_MEDIA = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.media.tooltip',
  {
    defaultMessage: 'Audio and video media files.',
  }
);

export const RESOURCE_TYPE_TOOLTIP_XHR = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.xhr.tooltip',
  {
    defaultMessage: 'XHR and fetch calls, such as JSON responses.',
  }
);

export const RESOURCE_TYPE_TOOLTIP_OTHER = i18n.translate(
  'xpack.synthetics.certs.resourceTypeFilter.other.tooltip',
  {
    defaultMessage: "Responses whose content type doesn't match any other category.",
  }
);

export const STATUS_COL = i18n.translate('xpack.synthetics.certs.list.status', {
  defaultMessage: 'Status',
});

export const TOO_OLD = i18n.translate('xpack.synthetics.certs.list.status.old', {
  defaultMessage: 'Too old',
});

export const COMMON_NAME_COL = i18n.translate('xpack.synthetics.certs.list.commonName', {
  defaultMessage: 'Common name',
});

export const MONITORS_COL = i18n.translate('xpack.synthetics.certs.list.monitors', {
  defaultMessage: 'Monitors',
});

export const ISSUED_BY_COL = i18n.translate('xpack.synthetics.certs.list.issuedBy', {
  defaultMessage: 'Issued by',
});

export const VALID_UNTIL_COL = i18n.translate('xpack.synthetics.certs.list.validUntil', {
  defaultMessage: 'Valid until',
});

export const TAGS_FILTER = i18n.translate('xpack.synthetics.certs.tagsFilter.label', {
  defaultMessage: 'Tags',
});

export const ISSUER_FILTER = i18n.translate('xpack.synthetics.certs.issuerFilter.label', {
  defaultMessage: 'Certificate authority',
});

export const ISSUER_FILTER_NO_ISSUERS = i18n.translate(
  'xpack.synthetics.certs.issuerFilter.noIssuers',
  {
    defaultMessage: 'No certificate authorities available',
  }
);

export const EXPIRY_WITHIN_1_DAY = i18n.translate('xpack.synthetics.certs.expiryFilter.days1', {
  defaultMessage: '1 day',
});

export const EXPIRY_WITHIN_7_DAYS = i18n.translate('xpack.synthetics.certs.expiryFilter.days7', {
  defaultMessage: '7 days',
});

export const EXPIRY_WITHIN_15_DAYS = i18n.translate('xpack.synthetics.certs.expiryFilter.days15', {
  defaultMessage: '15 days',
});

export const EXPIRY_WITHIN_30_DAYS = i18n.translate('xpack.synthetics.certs.expiryFilter.days30', {
  defaultMessage: '30 days',
});

export const TAGS_FILTER_NO_TAGS = i18n.translate('xpack.synthetics.certs.tagsFilter.noTags', {
  defaultMessage: 'No tags available',
});

export const ISSUED_ON_COL = i18n.translate('xpack.synthetics.certs.list.issuedOn', {
  defaultMessage: 'Issued on',
});

export const EXPAND_CERT_DETAILS = i18n.translate('xpack.synthetics.certs.list.expandDetails', {
  defaultMessage: 'Expand certificate details',
});

export const COLLAPSE_CERT_DETAILS = i18n.translate('xpack.synthetics.certs.list.collapseDetails', {
  defaultMessage: 'Collapse certificate details',
});

export const STAT_EXPIRED = i18n.translate('xpack.synthetics.certs.stats.expired', {
  defaultMessage: 'Expired',
});

export const EXPIRY_SUMMARY_ARIA = i18n.translate('xpack.synthetics.certs.stats.summaryAriaLabel', {
  defaultMessage: 'Filter certificates by expiry window',
});

export const EXPIRY_SUMMARY_LABEL = i18n.translate('xpack.synthetics.certs.stats.summaryLabel', {
  defaultMessage: 'Expiring within:',
});

export const EXPIRY_FILTER_TOOLTIP = i18n.translate('xpack.synthetics.certs.stats.filterTooltip', {
  defaultMessage: 'Click to filter',
});

export const EXPIRY_CLEAR_FILTER_TOOLTIP = i18n.translate(
  'xpack.synthetics.certs.stats.clearFilterTooltip',
  {
    defaultMessage: 'Click to clear filter',
  }
);

export const FINGERPRINTS_COL = i18n.translate('xpack.synthetics.certs.list.expirationDate', {
  defaultMessage: 'Fingerprints',
});

export const COPY_FINGERPRINT = i18n.translate('xpack.synthetics.certs.list.copyFingerprint', {
  defaultMessage: 'Click to copy fingerprint value',
});

export const FINGERPRINT_NOT_AVAILABLE = i18n.translate(
  'xpack.synthetics.certs.list.fingerprintNotAvailable',
  {
    defaultMessage: 'Not available',
  }
);

export const FINGERPRINT_NOT_AVAILABLE_TOOLTIP = i18n.translate(
  'xpack.synthetics.certs.list.fingerprintNotAvailableTooltip',
  {
    defaultMessage:
      'Browser monitors do not collect certificate fingerprints, only the certificate details.',
  }
);

export const NO_CERTS_AVAILABLE = i18n.translate('xpack.synthetics.certs.list.noCerts', {
  defaultMessage: 'No Certificates found.',
});

export const LOADING_CERTIFICATES = i18n.translate('xpack.synthetics.certificates.loading', {
  defaultMessage: 'Loading certificates ...',
});

export const REFRESH_CERT = i18n.translate('xpack.synthetics.certificates.refresh', {
  defaultMessage: 'Refresh',
});

export const settings = {
  breadcrumbText: i18n.translate('xpack.synthetics.settingsBreadcrumbText', {
    defaultMessage: 'Settings',
  }),
  editNoticeTitle: i18n.translate('xpack.synthetics.settings.cannotEditTitle', {
    defaultMessage: 'You do not have permission to edit settings.',
  }),
  editNoticeText: i18n.translate('xpack.synthetics.settings.cannotEditText', {
    defaultMessage:
      "Your user currently has 'Read' permissions for the Uptime app. Enable a permissions-level of 'All' to edit these settings.",
  }),
  mustBeNumber: i18n.translate('xpack.synthetics.settings.blankNumberField.error', {
    defaultMessage: 'Must be a number.',
  }),
};

export const BLANK_STR = i18n.translate('xpack.synthetics.settings.blank.error', {
  defaultMessage: 'May not be blank.',
});

export const SPACE_STR = i18n.translate('xpack.synthetics.settings.noSpace.error', {
  defaultMessage: 'Index names must not contain space',
});
