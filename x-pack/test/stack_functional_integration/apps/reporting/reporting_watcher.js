/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        '/api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FChicago,layout:(dimensions:(height:2024,width:3006.400146484375),id:preserve_layout),objectType:dashboard,relativeUrls:!(%27%2Fapp%2Fkibana%23%2Fdashboard%2F722b74f0-b882-11e8-a6d9-e546fe2bba5f%3F_g%3D(refreshInterval:(pause:!!f,value:900000),time:(from:now-7d,to:now))%26_a%3D(description:!%27Analyze%2Bmock%2BeCommerce%2Borders%2Band%2Brevenue!%27,filters:!!(),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),panels:!!((embeddableConfig:(vis:(colors:(!%27Men!!!%27s%2BAccessories!%27:%252382B5D8,!%27Men!!!%27s%2BClothing!%27:%2523F9BA8F,!%27Men!!!%27s%2BShoes!%27:%2523F29191,!%27Women!!!%27s%2BAccessories!%27:%2523F4D598,!%27Women!!!%27s%2BClothing!%27:%252370DBED,!%27Women!!!%27s%2BShoes!%27:%2523B7DBAB))),gridData:(h:10,i:!%271!%27,w:36,x:12,y:18),id:!%2737cc8650-b882-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%271!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(vis:(colors:(FEMALE:%25236ED0E0,MALE:%2523447EBC),legendOpen:!!f)),gridData:(h:11,i:!%272!%27,w:12,x:12,y:7),id:ed8436b0-b88b-11e8-a6d9-e546fe2bba5f,panelIndex:!%272!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:7,i:!%273!%27,w:18,x:0,y:0),id:!%2709ffee60-b88c-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%273!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:7,i:!%274!%27,w:30,x:18,y:0),id:!%271c389590-b88d-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%274!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:11,i:!%275!%27,w:48,x:0,y:28),id:!%2745e07720-b890-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%275!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:10,i:!%276!%27,w:12,x:0,y:18),id:!%2710f1a240-b891-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%276!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:11,i:!%277!%27,w:12,x:0,y:7),id:b80e6540-b891-11e8-a6d9-e546fe2bba5f,panelIndex:!%277!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(vis:(colors:(!%270%2B-%2B50!%27:%2523E24D42,!%2750%2B-%2B75!%27:%2523EAB839,!%2775%2B-%2B100!%27:%25237EB26D),defaultColors:(!%270%2B-%2B50!%27:!%27rgb(165,0,38)!%27,!%2750%2B-%2B75!%27:!%27rgb(255,255,190)!%27,!%2775%2B-%2B100!%27:!%27rgb(0,104,55)!%27),legendOpen:!!f)),gridData:(h:11,i:!%278!%27,w:12,x:24,y:7),id:!%274b3ec120-b892-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%278!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(vis:(colors:(!%270%2B-%2B2!%27:%2523E24D42,!%272%2B-%2B3!%27:%2523F2C96D,!%273%2B-%2B4!%27:%25239AC48A),defaultColors:(!%270%2B-%2B2!%27:!%27rgb(165,0,38)!%27,!%272%2B-%2B3!%27:!%27rgb(255,255,190)!%27,!%273%2B-%2B4!%27:!%27rgb(0,104,55)!%27),legendOpen:!!f)),gridData:(h:11,i:!%279!%27,w:12,x:36,y:7),id:!%279ca7aa90-b892-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%279!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:18,i:!%2710!%27,w:48,x:0,y:54),id:!%273ba638e0-b894-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%2710!%27,type:search,version:!%277.0.0-alpha1!%27),(embeddableConfig:(isLayerTOCOpen:!!f,mapCenter:(lat:45.88578,lon:-15.07605,zoom:2.11),openTOCDetails:!!()),gridData:(h:15,i:!%2711!%27,w:24,x:0,y:39),id:!%272c9c1f60-1909-11e9-919b-ffe5949a18d2!%27,panelIndex:!%2711!%27,type:map,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:15,i:!%2712!%27,w:24,x:24,y:39),id:b72dd430-bb4d-11e8-9c84-77068524bcab,panelIndex:!%2712!%27,type:visualization,version:!%277.0.0-alpha1!%27)),query:(language:kuery,query:!%27!%27),timeRestore:!!t,title:!%27%255BeCommerce%255D%2BRevenue%2BDashboard!%27,viewMode:view)%27),title:%27%5BeCommerce%5D%20Revenue%20Dashboard%27)';

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
        await getWatcher(watch, id, client, log, PageObjects.common, retry.tryForTime);
      });
      it('should delete watch and update revision', async () => {
        await deleteWatcher(watch, id, client, log);
      });
    });
  });
}
