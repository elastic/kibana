/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
// import { AppsMenuProvider } from 'test/functional/services/apps_menu';
// import { FtrProviderContext } from '../../../ftr_provider_context';
// import { TestSubjectsProvider } from 'test/functional/services/test_subjects';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  // const kibanaServer = getService('kibanaServer');
  // const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  // const globalNav = getService('globalNav');
  const find = getService('find');
  const log = getService('log');

  describe('internationalization', () => {
    before(async () => {
      //   navigateToApp('home')
      // or 
      await appsMenu.clickLink('Discover');
    });

    it('Discover page is translated', async () => {
      await testSubjects.exists('discoverQueryHits');
      const body = await find.byCssSelector('body');
      const bodyText = await body.getVisibleText();
      log.debug(`body = ${bodyText}`);
      // expect(bodyText).to.eql('默\n主页\ne\nA\nE\nObservability\nAPM\nAPM 自动从您的应用程序内收集深入全面的性能指标和错误。\n添加 APM\n日志\n');
      const menuText = await testSubjects.getVisibleText('top-nav');
      log.debug(`menuText = ${menuText}`);
      expect(menuText).to.eql('新建\n保存\n打开\n共享\n检查');

      const globalQueryBar = await find.byCssSelector('.globalQueryBar');
      const globalQueryBarText = await globalQueryBar.getVisibleText();
      log.debug(`globalQueryBarText = ${globalQueryBarText}`);
      expect(globalQueryBarText).to.eql('KQL\nLast 15 minutes\nShow dates\nRefresh\n+ 添加筛选');

      const discoverSideBar = await find.byCssSelector('#discover-sidebar');
      const discoverSideBarText = await discoverSideBar.getVisibleText();
      log.debug(`discoverSideBarText = ${discoverSideBarText}`);
      expect(discoverSideBarText).to.eql('kibana_sample_data_ecommerce\n已筛选字段\n0\n选定字段\n_source\n可用字段');


    });
    //   let titleText = await testSubjects.getVisibleText('space-avatar-default');
    //   expect(titleText).to.eql('默');

    //   titleText = await testSubjects.getAttribute('space-avatar-default', 'aria-label');
    //   expect(titleText).to.eql('默认值');
    //   titleText = await testSubjects.getAttribute('space-avatar-default', 'title');
    //   expect(titleText).to.eql('默认值');

    //   const titleElement = await find.byCssSelector('[id="aria-describedby.addAmpButtonLabel"]');
    //   titleText = await titleElement.getVisibleText();
    //   expect(titleText).to.eql('APM 自动从您的应用程序内收集深入全面的性能指标和错误。');
    // });


    // it('Home page whole body is translated', async () => {
    //   const body = await find.byCssSelector('body');
    //   const bodyText = await body.getVisibleText();
    //   log.debug(`body = ${bodyText}`);
    //   expect(bodyText).to.eql('默\n主页\ne\nA\nE\nObservability\nAPM\nAPM 自动从您的应用程序内收集深入全面的性能指标和错误。\n添加 APM\n日志\n'
    //   + '从常见的数据源采集日志，并在预配置的仪表板中轻松实现可视化。\n添加日志数据\n指标\n从您的服务器上运行的操作系统和服务收集指标。\n添加指标数据\n'
    //   + 'Security\nSIEM\n集中安全事件，以通过即用型可视化实现交互式调查。\n添加安全事件\n添加样例数据\n加载数据集和 Kibana 仪表板\n'
    //   + '从日志文件上传数据\n导入 CSV、NDJSON 或日志文件\n使用 Elasticsearch 数据\n连接到您的 Elasticsearch 索引\n可视化和浏览数据\nAPM\n'
    //   + '自动从您的应用程序内收集深入全面的性能指标和错误。\nCanvas\n以最佳像素展示您的数据。\nDiscover\n通过查询和筛选原始文档来以交互方式浏览您的数据。\n'
    //   + 'Graph\n显示并分析 Elasticsearch 数据中的相关关系。\nMaps\n从 Elasticsearch 和 Elastic 地图服务浏览地理空间数据\nSIEM\n'
    //   + 'Explore security metrics and logs for events and alerts\nVisualize\n创建可视化并聚合存储在 Elasticsearch 索引中的数据。\n仪表板\n'
    //   + '显示和共享可视化和已保存搜索的集合。\n指标\n浏览常用服务器、容器和服务的基础设施指标和日志。\n机器学习\n对时序数据的正常行为自动建模以检测异常。\n'
    //   + '运行时间\n执行终端节点运行状况检查和运行时间监测。\n鏃ュ織\n实时流式传输日志或在类似控制台的工具中滚动浏览历史视图。\n管理 Elastic Stack\nConsole\n'
    //   + 'Skip cURL and use this JSON interface to work with your data directly.\nLogstash 管道\n创建、删除、更新和克隆数据采集管道。\nMonitoring\n'
    //   + '跟踪 Elastic Stack 的实时运行状况和性能。\nRollups\n汇总历史数据并将其存储在较小的索引中以供将来分析。\nWatcher\n'
    //   + '通过创建、管理和监测警报来检测数据中的更改。\n安全性设置\n保护您的数据，并轻松管理谁有权限以用户和角色身份访问什么内容。\n工作区\n'
    //   + '将仪表板和其他已保存的对象管理为有意义的类别。\n已保存对象\n导入、导出和管理您的已保存搜索、可视化和仪表板。\n索引模式\n'
    //   + '管理帮助从 Elasticsearch 检索数据的索引模式。\n未找到要寻找的内容？\n查看 Kibana 插件的完整目录'
    //   );
    // });


  });
}
