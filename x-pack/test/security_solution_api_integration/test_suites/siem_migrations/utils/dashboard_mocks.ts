/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultRawDashboard = {
  id: 'https://127.0.0.1:8089/servicesNS/nobody/system/data/ui/views/_admin',
  label: 'Internal Admin Nav',
  title: '_admin',
  xml: '<view isVisible="false" >\n  <label>Internal Admin Nav</label>\n  <module name="Message" layoutPanel="messaging">\n    <param name="filter">*</param>\n    <param name="clearOnJobDispatch">False</param>\n    <param name="maxSize">1</param>\n  </module>\n  <module name="AccountBar" layoutPanel="appHeader">\n    <param name="mode">lite</param>\n  </module>\n  <module name="LiteBar" layoutPanel="liteHeader"></module>\n</view>',
  app: 'system',
  sharing: 'system',
  owner: 'nobody',
  updated: '1970-01-01T00:00:00+00:00',
};
