/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { languageToText } from '../../utils/language_to_text';

export const NEW_INDEX_TEMPLATE_TYPES: { [key: string]: string } = {
  api: i18n.translate('xpack.enterpriseSearch.content.newIndex.types.api', {
    defaultMessage: 'API endpoint',
  }),
  connector: i18n.translate('xpack.enterpriseSearch.content.newIndex.types.connector', {
    defaultMessage: 'Connector',
  }),
  crawler: i18n.translate('xpack.enterpriseSearch.content.newIndex.types.crawler', {
    defaultMessage: 'Web crawler',
  }),
  elasticsearch: i18n.translate('xpack.enterpriseSearch.content.newIndex.types.elasticsearch', {
    defaultMessage: 'Elasticsearch index',
  }),
  json: i18n.translate('xpack.enterpriseSearch.content.newIndex.types.json', {
    defaultMessage: 'JSON',
  }),
};

export const DOCUMENTS_API_JSON_EXAMPLE = {
  id: 'park_rocky-mountain',
  title: 'Rocky Mountain',
  description:
    'Bisected north to south by the Continental Divide, this portion of the Rockies has ecosystems varying from over 150 riparian lakes to montane and subalpine forests to treeless alpine tundra. Wildlife including mule deer, bighorn sheep, black bears, and cougars inhabit its igneous mountains and glacial valleys. Longs Peak, a classic Colorado fourteener, and the scenic Bear Lake are popular destinations, as well as the historic Trail Ridge Road, which reaches an elevation of more than 12,000 feet (3,700 m).',
  nps_link: 'https://www.nps.gov/romo/index.htm',
  states: ['Colorado'],
  visitors: 4517585,
  world_heritage_site: false,
  location: '40.4,-105.58',
  acres: 265795.2,
  square_km: 1075.6,
  date_established: '1915-01-26T06:00:00Z',
};

export const UNIVERSAL_LANGUAGE_VALUE = '';

export const SUPPORTED_LANGUAGES: EuiSelectOption[] = [
  {
    text: languageToText(UNIVERSAL_LANGUAGE_VALUE),
    value: UNIVERSAL_LANGUAGE_VALUE,
  },
  {
    disabled: true,
    text: '—',
  },
  {
    text: languageToText('zh'),
    value: 'zh',
  },
  {
    text: languageToText('da'),
    value: 'da',
  },
  {
    text: languageToText('nl'),
    value: 'nl',
  },
  {
    text: languageToText('en'),
    value: 'en',
  },
  {
    text: languageToText('fr'),
    value: 'fr',
  },
  {
    text: languageToText('de'),
    value: 'de',
  },
  {
    text: languageToText('it'),
    value: 'it',
  },
  {
    text: languageToText('ja'),
    value: 'ja',
  },
  {
    text: languageToText('ko'),
    value: 'ko',
  },
  {
    text: languageToText('pt'),
    value: 'pt',
  },
  {
    text: languageToText('pt-br'),
    value: 'pt-br',
  },
  {
    text: languageToText('ru'),
    value: 'ru',
  },
  {
    text: languageToText('es'),
    value: 'es',
  },
  {
    text: languageToText('th'),
    value: 'th',
  },
];
