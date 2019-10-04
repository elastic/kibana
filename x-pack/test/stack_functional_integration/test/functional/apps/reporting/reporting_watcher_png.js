import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';

export default function({ getService, getPageObjects }) {

  describe('watcher app', function describeIndexTests () {
    const config = getService('config');
    const servers = config.get('servers');
    const log = getService('log');
    const { KIBANAIP, VERSION_NUMBER, VM, VERSION_BUILD_HASH, STARTEDBY } = getService('provisionedEnv');
    const PageObjects = getPageObjects(['common']);

    describe('PNG Reporting watch', () => {
      const watchId = 'watcher_report' + new Date().getTime();

      it('should successfully add a new watch for png Reporting', async () => {

        const url = servers.kibana.protocol + '://'
          + KIBANAIP + ':' + servers.kibana.port
          + '/api/reporting/generate/png?jobParams=(browserTimezone:America%2FChicago,layout:(dimensions:(height:2024,width:3006.400146484375),id:png),objectType:dashboard,relativeUrl:%27%2Fapp%2Fkibana%23%2Fdashboard%2F722b74f0-b882-11e8-a6d9-e546fe2bba5f%3F_g%3D(refreshInterval:(pause:!!f,value:900000),time:(from:now-7d,to:now))%26_a%3D(description:!%27Analyze%2Bmock%2BeCommerce%2Borders%2Band%2Brevenue!%27,filters:!!(),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),panels:!!((embeddableConfig:(vis:(colors:(!%27Men!!!%27s%2BAccessories!%27:%252382B5D8,!%27Men!!!%27s%2BClothing!%27:%2523F9BA8F,!%27Men!!!%27s%2BShoes!%27:%2523F29191,!%27Women!!!%27s%2BAccessories!%27:%2523F4D598,!%27Women!!!%27s%2BClothing!%27:%252370DBED,!%27Women!!!%27s%2BShoes!%27:%2523B7DBAB))),gridData:(h:10,i:!%271!%27,w:36,x:12,y:18),id:!%2737cc8650-b882-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%271!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(vis:(colors:(FEMALE:%25236ED0E0,MALE:%2523447EBC),legendOpen:!!f)),gridData:(h:11,i:!%272!%27,w:12,x:12,y:7),id:ed8436b0-b88b-11e8-a6d9-e546fe2bba5f,panelIndex:!%272!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:7,i:!%273!%27,w:18,x:0,y:0),id:!%2709ffee60-b88c-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%273!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:7,i:!%274!%27,w:30,x:18,y:0),id:!%271c389590-b88d-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%274!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:11,i:!%275!%27,w:48,x:0,y:28),id:!%2745e07720-b890-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%275!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:10,i:!%276!%27,w:12,x:0,y:18),id:!%2710f1a240-b891-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%276!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:11,i:!%277!%27,w:12,x:0,y:7),id:b80e6540-b891-11e8-a6d9-e546fe2bba5f,panelIndex:!%277!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(vis:(colors:(!%270%2B-%2B50!%27:%2523E24D42,!%2750%2B-%2B75!%27:%2523EAB839,!%2775%2B-%2B100!%27:%25237EB26D),defaultColors:(!%270%2B-%2B50!%27:!%27rgb(165,0,38)!%27,!%2750%2B-%2B75!%27:!%27rgb(255,255,190)!%27,!%2775%2B-%2B100!%27:!%27rgb(0,104,55)!%27),legendOpen:!!f)),gridData:(h:11,i:!%278!%27,w:12,x:24,y:7),id:!%274b3ec120-b892-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%278!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(vis:(colors:(!%270%2B-%2B2!%27:%2523E24D42,!%272%2B-%2B3!%27:%2523F2C96D,!%273%2B-%2B4!%27:%25239AC48A),defaultColors:(!%270%2B-%2B2!%27:!%27rgb(165,0,38)!%27,!%272%2B-%2B3!%27:!%27rgb(255,255,190)!%27,!%273%2B-%2B4!%27:!%27rgb(0,104,55)!%27),legendOpen:!!f)),gridData:(h:11,i:!%279!%27,w:12,x:36,y:7),id:!%279ca7aa90-b892-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%279!%27,type:visualization,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:18,i:!%2710!%27,w:48,x:0,y:54),id:!%273ba638e0-b894-11e8-a6d9-e546fe2bba5f!%27,panelIndex:!%2710!%27,type:search,version:!%277.0.0-alpha1!%27),(embeddableConfig:(isLayerTOCOpen:!!f,mapCenter:(lat:45.88578,lon:-15.07605,zoom:2.11),openTOCDetails:!!()),gridData:(h:15,i:!%2711!%27,w:24,x:0,y:39),id:!%272c9c1f60-1909-11e9-919b-ffe5949a18d2!%27,panelIndex:!%2711!%27,type:map,version:!%277.0.0-alpha1!%27),(embeddableConfig:(),gridData:(h:15,i:!%2712!%27,w:24,x:24,y:39),id:b72dd430-bb4d-11e8-9c84-77068524bcab,panelIndex:!%2712!%27,type:visualization,version:!%277.0.0-alpha1!%27)),query:(language:kuery,query:!%27!%27),timeRestore:!!t,title:!%27%255BeCommerce%255D%2BRevenue%2BDashboard!%27,viewMode:view)%27,title:%27%5BeCommerce%5D%20Revenue%20Dashboard%27)';

        // const url = config.servers.kibana.protocol + "://"
        // + KIBANAIP + ":" + config.servers.kibana.port
        // + "/api/reporting/generate/png?jobParams=(browserTimezone:Europe%2FBucharest,layout:(dimensions:(height:1400,width:1864)),objectType:dashboard,relativeUrl:%27%2Fapp%2Fkibana%23%2Fdashboard%2FMetricbeat-system-overview-ecs%3F_g%3D()%26_a%3D(description:!%27Overview%2Bof%2Bsystem%2Bmetrics!%27,filters:!!(),fullScreenMode:!!f,options:(darkTheme:!!f),panels:!!((gridData:(h:5,i:!%279!%27,w:48,x:0,y:0),id:System-Navigation-ecs,panelIndex:!%279!%27,type:visualization,version:!%277.0.0-beta1!%27),(embeddableConfig:(vis:(defaultColors:(!%270%2B-%2B100!%27:!%27rgb(0,104,55)!%27))),gridData:(h:10,i:!%2711!%27,w:8,x:0,y:5),id:c6f2ffd0-4d17-11e7-a196-69b9a7a020a9-ecs,panelIndex:!%2711!%27,type:visualization,version:!%277.0.0-beta1!%27),(embeddableConfig:(vis:(defaultColors:(!%270%2B-%2B100!%27:!%27rgb(0,104,55)!%27))),gridData:(h:25,i:!%2712!%27,w:24,x:24,y:15),id:fe064790-1b1f-11e7-bec4-a5e9ec5cab8b-ecs,panelIndex:!%2712!%27,type:visualization,version:!%277.0.0-beta1!%27),(gridData:(h:25,i:!%2713!%27,w:24,x:0,y:15),id:!%27855899e0-1b1c-11e7-b09e-037021c4f8df-ecs!%27,panelIndex:!%2713!%27,type:visualization,version:!%277.0.0-beta1!%27),(embeddableConfig:(vis:(defaultColors:(!%270%2525%2B-%2B15%2525!%27:!%27rgb(247,252,245)!%27,!%2715%2525%2B-%2B30%2525!%27:!%27rgb(199,233,192)!%27,!%2730%2525%2B-%2B45%2525!%27:!%27rgb(116,196,118)!%27,!%2745%2525%2B-%2B60%2525!%27:!%27rgb(35,139,69)!%27))),gridData:(h:30,i:!%2714!%27,w:48,x:0,y:40),id:!%277cdb1330-4d1a-11e7-a196-69b9a7a020a9-ecs!%27,panelIndex:!%2714!%27,type:visualization,version:!%277.0.0-beta1!%27),(embeddableConfig:(vis:(defaultColors:(!%270%2B-%2B100!%27:!%27rgb(0,104,55)!%27))),gridData:(h:10,i:!%2716!%27,w:8,x:32,y:5),id:!%27522ee670-1b92-11e7-bec4-a5e9ec5cab8b-ecs!%27,panelIndex:!%2716!%27,type:visualization,version:!%277.0.0-beta1!%27),(gridData:(h:10,i:!%2717!%27,w:8,x:40,y:5),id:!%271aae9140-1b93-11e7-8ada-3df93aab833e-ecs!%27,panelIndex:!%2717!%27,type:visualization,version:!%277.0.0-beta1!%27),(gridData:(h:10,i:!%2718!%27,w:8,x:24,y:5),id:!%27825fdb80-4d1d-11e7-b5f2-2b7c1895bf32-ecs!%27,panelIndex:!%2718!%27,type:visualization,version:!%277.0.0-beta1!%27),(gridData:(h:10,i:!%2719!%27,w:8,x:16,y:5),id:d3166e80-1b91-11e7-bec4-a5e9ec5cab8b-ecs,panelIndex:!%2719!%27,type:visualization,version:!%277.0.0-beta1!%27),(gridData:(h:10,i:!%2720!%27,w:8,x:8,y:5),id:!%2783e12df0-1b91-11e7-bec4-a5e9ec5cab8b-ecs!%27,panelIndex:!%2720!%27,type:visualization,version:!%277.0.0-beta1!%27)),query:(language:lucene,query:(query_string:(analyze_wildcard:!!t,query:!%27*!%27))),timeRestore:!!f,title:!%27%255BMetricbeat%2BSystem%255D%2BOverview%2BECS!%27,viewMode:view)%27,title:%27%5BMetricbeat%20System%5D%20Overview%20ECS%27)"

        const watcherReport = {
          'trigger': {
            'schedule': {
              'interval': '200s',
            },
          },
          'actions': {
            'email_admin': {
              'email': {
                'to': ['wayne.seymour@elastic.co', 'lee.drengenberg@elastic.co', 'rashmi.kulkarni@elastic.co', 'bhavya@elastic.co', 'watchertest123@gmail.com'],
                'subject': 'PNG ' + VERSION_NUMBER + ' ' + watchId + ', VM=' + VM
                  + ' ' + VERSION_BUILD_HASH + ' by:' + STARTEDBY,
                'attachments': {
                  'test_report.png': {
                    'reporting': {
                      'url': url,
                      'auth': {
                        'basic': {
                          'username': servers.elasticsearch.username,
                          'password': servers.elasticsearch.password,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const esClient = new Client({
          node: new URL(`${servers.elasticsearch.protocol}://${servers.elasticsearch.auth}@${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`).toString()
        });
        const response = await esClient.watcher.putWatch({ id: watchId, body: watcherReport});
        log.debug(response);
        expect(response.body._id).to.eql(watchId);
        expect(response.statusCode).to.eql('201');
        expect(response.body._version).to.eql('1');
      });

      // it('should be successful and update revision', function() {
      //   return PageObjects.common.sleep(200000)
      //     .then(() => {
      //       return PageObjects.common.tryForTime(90000, () => {
      //         return PageObjects.common.sleep(15000)
      //           .then(() => {
      //             return esClient.search('.watcher-history*', 'watch_id:' + watchId);
      //           })
      //           .then((response) => {
      //             PageObjects.common.debug('\n.watcher-history*=' + JSON.stringify(response) + '\n');
      //           })
      //           .then(() => {
      //             return esClient.get('.watches', '_doc', watchId)
      //               .then((response) => {
      //                 PageObjects.common.debug('\nresponse=' + JSON.stringify(response) + '\n');
      //                 expect(response.body._id).to.eql(watchId);
      //                 expect(response.body._version).to.eql(2);
      //                 expect(response.body._source.status.execution_state).to.eql('executed');
      //                 return response;
      //               });
      //           });
      //       })
      //         .then((response) => {
      //           expect(response.body._source.status.actions.email_admin.last_execution.successful).to.eql(true);
      //         });
      //     });
      // });
      //
      // it('should delete watch and update revision', function() {
      //   return esClient.deleteWatch(watchId)
      //     .then((response) => {
      //       PageObjects.common.debug('\nresponse=' + JSON.stringify(response) + '\n');
      //       expect(response.body._id).to.eql(watchId);
      //       expect(response.body.found).to.eql(true);
      //       expect(response.statusCode).to.eql('200');
      //     });
      // });

    });

  });
}
