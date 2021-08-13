/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWatcher, deleteWatcher, putWatcher } from './util';

export default function ({ getService, getPageObjects }) {
  describe('watcher app', function describeIndexTests() {
    const config = getService('config');
    const servers = config.get('servers');
    const retry = getService('retry');
    const log = getService('log');
    const client = getService('es');

    const KIBANAIP = process.env.KIBANAIP;
    const VERSION_NUMBER = process.env.VERSION_NUMBER;
    const VM = process.env.VM;
    const VERSION_BUILD_HASH = process.env.VERSION_BUILD_HASH;
    const STARTEDBY = process.env.STARTEDBY;
    const REPORTING_TEST_EMAILS = process.env.REPORTING_TEST_EMAILS;

    const PageObjects = getPageObjects(['common']);
    describe('PDF Reporting watch', function () {
      let id = 'watcher_report-';
      id = id + new Date().getTime(); // For debugging.
      const watch = { id };
      const interval = 10;
      const emails = REPORTING_TEST_EMAILS.split(',');

      // https://localhost:5601/api/reporting/generate/printablePdf?jobParams=(objectType:dashboard,queryString:%27_g%3D(refreshInterval%3A(display%3AOff%2Cpause%3A!!f%2Cvalue%3A0)%2Ctime%3A(from%3Anow-7d%2Cmode%3Aquick%2Cto%3Anow))%26_a%3D(description%3A%2527%2527%2Cfilters%3A!!()%2CfullScreenMode%3A!!f%2Coptions%3A(darkTheme%3A!!f)%2Cpanels%3A!!((col%3A1%2Cid%3ASystem-Navigation%2CpanelIndex%3A9%2Crow%3A1%2Csize_x%3A8%2Csize_y%3A1%2Ctype%3Avisualization)%2C(col%3A1%2Cid%3Ac6f2ffd0-4d17-11e7-a196-69b9a7a020a9%2CpanelIndex%3A11%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A7%2Cid%3Afe064790-1b1f-11e7-bec4-a5e9ec5cab8b%2CpanelIndex%3A12%2Crow%3A4%2Csize_x%3A6%2Csize_y%3A5%2Ctype%3Avisualization)%2C(col%3A1%2Cid%3A%2527855899e0-1b1c-11e7-b09e-037021c4f8df%2527%2CpanelIndex%3A13%2Crow%3A4%2Csize_x%3A6%2Csize_y%3A5%2Ctype%3Avisualization)%2C(col%3A1%2Cid%3A%25277cdb1330-4d1a-11e7-a196-69b9a7a020a9%2527%2CpanelIndex%3A14%2Crow%3A9%2Csize_x%3A12%2Csize_y%3A6%2Ctype%3Avisualization)%2C(col%3A9%2Cid%3A%2527522ee670-1b92-11e7-bec4-a5e9ec5cab8b%2527%2CpanelIndex%3A16%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A11%2Cid%3A%25271aae9140-1b93-11e7-8ada-3df93aab833e%2527%2CpanelIndex%3A17%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A7%2Cid%3A%2527825fdb80-4d1d-11e7-b5f2-2b7c1895bf32%2527%2CpanelIndex%3A18%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A5%2Cid%3Ad3166e80-1b91-11e7-bec4-a5e9ec5cab8b%2CpanelIndex%3A19%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A3%2Cid%3A%252783e12df0-1b91-11e7-bec4-a5e9ec5cab8b%2527%2CpanelIndex%3A20%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A9%2Cid%3Ae9d22060-4d64-11e7-aa29-87a97a796de6%2CpanelIndex%3A21%2Crow%3A1%2Csize_x%3A4%2Csize_y%3A1%2Ctype%3Avisualization))%2Cquery%3A(language%3Alucene%2Cquery%3A(query_string%3A(analyze_wildcard%3A!!t%2Cquery%3A%2527*%2527)))%2CtimeRestore%3A!!f%2Ctitle%3A%2527Metricbeat%2Bsystem%2Boverview%2527%2CuiState%3A(P-11%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-12%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-14%3A(vis%3A(defaultColors%3A(%25270%2525%2B-%2B8.75%2525%2527%3A%2527rgb(247%2C252%2C245)%2527%2C%252717.5%2525%2B-%2B26.25%2525%2527%3A%2527rgb(116%2C196%2C118)%2527%2C%252726.25%2525%2B-%2B35%2525%2527%3A%2527rgb(35%2C139%2C69)%2527%2C%25278.75%2525%2B-%2B17.5%2525%2527%3A%2527rgb(199%2C233%2C192)%2527)))%2CP-16%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-2%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-3%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527))))%2CviewMode%3Aview)%27,savedObjectId:Metricbeat-system-overview)
      // https://localhost:5601/api/reporting/generate/printablePdf?jobParams=(objectType:dashboard,queryString:%27_g%3D()%26_a%3D(description%3A%2527%2527%2Cfilters%3A!!()%2CfullScreenMode%3A!!f%2Coptions%3A(darkTheme%3A!!f)%2Cpanels%3A!!((col%3A1%2Cid%3ASystem-Navigation%2CpanelIndex%3A9%2Crow%3A1%2Csize_x%3A12%2Csize_y%3A1%2Ctype%3Avisualization)%2C(col%3A1%2Cid%3Ac6f2ffd0-4d17-11e7-a196-69b9a7a020a9%2CpanelIndex%3A11%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A7%2Cid%3Afe064790-1b1f-11e7-bec4-a5e9ec5cab8b%2CpanelIndex%3A12%2Crow%3A4%2Csize_x%3A6%2Csize_y%3A5%2Ctype%3Avisualization)%2C(col%3A1%2Cid%3A%2527855899e0-1b1c-11e7-b09e-037021c4f8df%2527%2CpanelIndex%3A13%2Crow%3A4%2Csize_x%3A6%2Csize_y%3A5%2Ctype%3Avisualization)%2C(col%3A1%2Cid%3A%25277cdb1330-4d1a-11e7-a196-69b9a7a020a9%2527%2CpanelIndex%3A14%2Crow%3A9%2Csize_x%3A12%2Csize_y%3A6%2Ctype%3Avisualization)%2C(col%3A9%2Cid%3A%2527522ee670-1b92-11e7-bec4-a5e9ec5cab8b%2527%2CpanelIndex%3A16%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A11%2Cid%3A%25271aae9140-1b93-11e7-8ada-3df93aab833e%2527%2CpanelIndex%3A17%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A7%2Cid%3A%2527825fdb80-4d1d-11e7-b5f2-2b7c1895bf32%2527%2CpanelIndex%3A18%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A5%2Cid%3Ad3166e80-1b91-11e7-bec4-a5e9ec5cab8b%2CpanelIndex%3A19%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization)%2C(col%3A3%2Cid%3A%252783e12df0-1b91-11e7-bec4-a5e9ec5cab8b%2527%2CpanelIndex%3A20%2Crow%3A2%2Csize_x%3A2%2Csize_y%3A2%2Ctype%3Avisualization))%2Cquery%3A(language%3Alucene%2Cquery%3A(query_string%3A(analyze_wildcard%3A!!t%2Cdefault_field%3A%2527*%2527%2Cquery%3A%2527*%2527)))%2CtimeRestore%3A!!f%2Ctitle%3A%2527%255BMetricbeat%2BSystem%255D%2BOverview%2527%2CuiState%3A(P-11%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-12%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-14%3A(vis%3A(defaultColors%3A(%25270%2525%2B-%2B8.75%2525%2527%3A%2527rgb(247%2C252%2C245)%2527%2C%252717.5%2525%2B-%2B26.25%2525%2527%3A%2527rgb(116%2C196%2C118)%2527%2C%252726.25%2525%2B-%2B35%2525%2527%3A%2527rgb(35%2C139%2C69)%2527%2C%25278.75%2525%2B-%2B17.5%2525%2527%3A%2527rgb(199%2C233%2C192)%2527)))%2CP-16%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-2%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527)))%2CP-3%3A(vis%3A(defaultColors%3A(%25270%2B-%2B100%2527%3A%2527rgb(0%2C104%2C55)%2527))))%2CviewMode%3Aview)%27,savedObjectId:Metricbeat-system-overview)
      // https://localhost:5601
      //      "/api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FChicago,layout:(dimensions:(height:540.5,width:633),id:preserve_layout),objectType:visualization,relativeUrls:!(%27%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2FLatency-histogram%3F_g%3D(refreshInterval:(pause:!!t,value:0),time:(from:now-24h,mode:quick,to:now))%26_a%3D(filters:!!(),linked:!!t,query:(language:lucene,query:!%27!%27),uiState:(),vis:(aggs:!!((enabled:!!t,id:!%271!%27,params:(),schema:metric,type:count),(enabled:!!t,id:!%272!%27,params:(extended_bounds:(),field:responsetime,interval:10),schema:segment,type:histogram)),params:(addLegend:!!t,addTimeMarker:!!f,addTooltip:!!t,categoryAxes:!!((id:CategoryAxis-1,labels:(show:!!t,truncate:100),position:bottom,scale:(type:linear),show:!!t,style:(),title:(),type:category)),defaultYExtents:!!f,grid:(categoryLines:!!f,style:(color:%2523eee)),interpolate:linear,legendPosition:right,mode:stacked,scale:linear,seriesParams:!!((data:(id:!%271!%27,label:Count),interpolate:cardinal,mode:stacked,show:true,type:area,valueAxis:ValueAxis-1)),setYExtents:!!f,shareYAxis:!!t,smoothLines:!!t,times:!!(),type:area,valueAxes:!!((id:ValueAxis-1,labels:(filter:!!f,rotate:0,show:!!t,truncate:100),name:LeftAxis-1,position:left,scale:(defaultYExtents:!!f,mode:normal,setYExtents:!!f,type:linear),show:!!t,style:(),title:(text:Count),type:value)),yAxis:()),title:!%27Latency%2Bhistogram!%27,type:area))%27),title:%27Latency%20histogram%27)
      const url =
        servers.kibana.protocol +
        '://' +
        KIBANAIP +
        ':' +
        servers.kibana.port +
        '/api/reporting/generate/printablePdf?jobParams=%28browserTimezone%3AEurope%2FParis%2Clayout%3A%28dimensions%3A%28height%3A2052%2Cwidth%3A2542.666748046875%29%2Cid%3Apreserve_layout%2Cselectors%3A%28itemsCountAttribute%3Adata-shared-items-count%2CrenderComplete%3A%5Bdata-shared-item%5D%2Cscreenshot%3A%5Bdata-shared-items-container%5D%2CtimefilterDurationAttribute%3Adata-shared-timefilter-duration%29%29%2CobjectType%3Adashboard%2CrelativeUrls%3A%21%28%27%2Fapp%2Fdashboards%23%2Fview%2F722b74f0-b882-11e8-a6d9-e546fe2bba5f%3F_g%3D%28filters%3A%21%21%28%29%29%26_a%3D%28description%3A%21%27Analyze%2520mock%2520eCommerce%2520orders%2520and%2520revenue%21%27%2Cfilters%3A%21%21%28%29%2CfullScreenMode%3A%21%21f%2Coptions%3A%28hidePanelTitles%3A%21%21f%2CuseMargins%3A%21%21t%29%2Cpanels%3A%21%21%28%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A10%2Ci%3A%21%275%21%27%2Cw%3A24%2Cx%3A0%2Cy%3A22%29%2Cid%3A%21%2745e07720-b890-11e8-a6d9-e546fe2bba5f%21%27%2CpanelIndex%3A%21%275%21%27%2Ctype%3Avisualization%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A7%2Ci%3A%21%277%21%27%2Cw%3A12%2Cx%3A36%2Cy%3A15%29%2Cid%3Ab80e6540-b891-11e8-a6d9-e546fe2bba5f%2CpanelIndex%3A%21%277%21%27%2Ctype%3Avisualization%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A18%2Ci%3A%21%2710%21%27%2Cw%3A48%2Cx%3A0%2Cy%3A55%29%2Cid%3A%21%273ba638e0-b894-11e8-a6d9-e546fe2bba5f%21%27%2CpanelIndex%3A%21%2710%21%27%2Ctype%3Asearch%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%2ChiddenLayers%3A%21%21%28%29%2CisLayerTOCOpen%3A%21%21f%2CmapBuffer%3A%28maxLat%3A66.51326%2CmaxLon%3A90%2CminLat%3A0%2CminLon%3A-135%29%2CmapCenter%3A%28lat%3A45.88578%2Clon%3A-15.07605%2Czoom%3A2.11%29%2CopenTOCDetails%3A%21%21%28%29%29%2CgridData%3A%28h%3A14%2Ci%3A%21%2711%21%27%2Cw%3A24%2Cx%3A0%2Cy%3A32%29%2Cid%3A%21%272c9c1f60-1909-11e9-919b-ffe5949a18d2%21%27%2CpanelIndex%3A%21%2711%21%27%2Ctype%3Amap%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A7%2Ci%3Aa71cf076-6895-491c-8878-63592e429ed5%2Cw%3A18%2Cx%3A0%2Cy%3A0%29%2Cid%3Ac00d1f90-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3Aa71cf076-6895-491c-8878-63592e429ed5%2Ctype%3Avisualization%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A7%2Ci%3Aadc0a2f4-481c-45eb-b422-0ea59a3e5163%2Cw%3A30%2Cx%3A18%2Cy%3A0%29%2Cid%3Ac3378480-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3Aadc0a2f4-481c-45eb-b422-0ea59a3e5163%2Ctype%3Avisualization%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%2ChidePanelTitles%3A%21%21f%29%2CgridData%3A%28h%3A8%2Ci%3A%21%277077b79f-2a99-4fcb-bbd4-456982843278%21%27%2Cw%3A24%2Cx%3A0%2Cy%3A7%29%2Cid%3Ac762b7a0-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3A%21%277077b79f-2a99-4fcb-bbd4-456982843278%21%27%2Ctitle%3A%21%27%2525%2520of%2520target%2520revenue%2520%28%2410k%29%21%27%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A8%2Ci%3A%21%2719a3c101-ad2e-4421-a71b-a4734ec1f03e%21%27%2Cw%3A12%2Cx%3A24%2Cy%3A7%29%2Cid%3Ace02e260-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3A%21%2719a3c101-ad2e-4421-a71b-a4734ec1f03e%21%27%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A8%2Ci%3A%21%27491469e7-7d24-4216-aeb3-bca00e5c8c1b%21%27%2Cw%3A12%2Cx%3A36%2Cy%3A7%29%2Cid%3Ad5f90030-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3A%21%27491469e7-7d24-4216-aeb3-bca00e5c8c1b%21%27%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A7%2Ci%3Aa1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef%2Cw%3A24%2Cx%3A0%2Cy%3A15%29%2Cid%3Adde978b0-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3Aa1b03eb9-a36b-4e12-aa1b-bb29b5d6c4ef%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A7%2Ci%3Ada51079b-952f-43dc-96e6-6f9415a3708b%2Cw%3A12%2Cx%3A24%2Cy%3A15%29%2Cid%3Ae3902840-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3Ada51079b-952f-43dc-96e6-6f9415a3708b%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A10%2Ci%3A%21%2764fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b%21%27%2Cw%3A24%2Cx%3A24%2Cy%3A22%29%2Cid%3Aeddf7850-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3A%21%2764fd5dcf-30c5-4f5a-a78c-70b1fbf87e5b%21%27%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A14%2Ci%3Abd330ede-2eef-4e2a-8100-22a21abf5038%2Cw%3A24%2Cx%3A24%2Cy%3A32%29%2Cid%3Aff6a21b0-f5ea-11eb-a78e-83aac3c38a60%2CpanelIndex%3Abd330ede-2eef-4e2a-8100-22a21abf5038%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%2ChidePanelTitles%3A%21%21f%29%2CgridData%3A%28h%3A9%2Ci%3Ab897d4be-cf83-46fb-a111-c7fbec9ef403%2Cw%3A24%2Cx%3A0%2Cy%3A46%29%2Cid%3A%21%2703071e90-f5eb-11eb-a78e-83aac3c38a60%21%27%2CpanelIndex%3Ab897d4be-cf83-46fb-a111-c7fbec9ef403%2Ctitle%3A%21%27Top%2520products%2520this%2520week%21%27%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%2ChidePanelTitles%3A%21%21f%2CtimeRange%3A%28from%3Anow-2w%2Cto%3Anow-1w%29%29%2CgridData%3A%28h%3A9%2Ci%3Ae0f68f93-30f2-4da7-889a-6cd128a68d3f%2Cw%3A24%2Cx%3A24%2Cy%3A46%29%2Cid%3A%21%2706379e00-f5eb-11eb-a78e-83aac3c38a60%21%27%2CpanelIndex%3Ae0f68f93-30f2-4da7-889a-6cd128a68d3f%2Ctitle%3A%21%27Top%2520products%2520last%2520week%21%27%2Ctype%3Alens%2Cversion%3A%21%278.0.0%21%27%29%29%2Cquery%3A%28language%3Akuery%2Cquery%3A%21%27%21%27%29%2Ctags%3A%21%21%28%29%2CtimeRestore%3A%21%21t%2Ctitle%3A%21%27%255BeCommerce%255D%2520Revenue%2520Dashboard%21%27%2CviewMode%3Aview%29%27%29%2Ctitle%3A%27%5BeCommerce%5D%20Revenue%20Dashboard%27%2Cversion%3A%278.0.0%27%29';

      const body = {
        trigger: {
          schedule: {
            interval: `${interval}s`,
          },
        },
        actions: {
          email_admin: {
            email: {
              to: emails,
              subject:
                'PDF ' +
                VERSION_NUMBER +
                ' ' +
                id +
                ', VM=' +
                VM +
                ' ' +
                VERSION_BUILD_HASH +
                ' by:' +
                STARTEDBY,
              attachments: {
                'test_report.pdf': {
                  reporting: {
                    url: url,
                    auth: {
                      basic: {
                        username: servers.elasticsearch.username,
                        password: servers.elasticsearch.password,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      it('should successfully add a new watch for PDF Reporting', async () => {
        await putWatcher(watch, id, body, client, log);
      });
      it('should be successful and increment revision', async () => {
        await getWatcher(watch, id, client, log, PageObjects.common, retry.tryForTime.bind(retry));
      });
      it('should delete watch and update revision', async () => {
        await deleteWatcher(watch, id, client, log);
      });
    });
  });
}
