/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getI18nLocaleFromServerArgs(kbnServerArgs: string[]): string {
  const re = /--i18n\.locale=(?<locale>.*)/;
  for (const serverArg of kbnServerArgs) {
    const match = re.exec(serverArg);
    const locale = match?.groups?.locale;
    if (locale) {
      return locale;
    }
  }

  throw Error('i18n.locale is not set in the server arguments');
}
