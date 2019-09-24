
import {
  defaultFindTimeout,
} from '../index';

import {
  config
} from '../index';

import PageObjects from './index';

export default class ShieldPage {

  init(remote) {
    this.remote = remote;
  }

  async login(user, pwd) {
    const remote = this.remote;
    try {
      await PageObjects.common.findTestSubject('loginUsername').type(user);
      await PageObjects.common.findTestSubject('loginPassword').type(pwd);
      await PageObjects.common.findTestSubject('loginSubmit').click();
      await PageObjects.common.sleep(2123);
      PageObjects.common.debug('wait for kibanaWelcomeLogo deleted');
      await remote.waitForDeletedByClassName('kibanaWelcomeLogo');
    } catch (err) {
      // If we fail above, we're assuming we're on the SAML/OIDC auth0 login page.
      // In this case, always use the one saml/oidc user defined in the provision file.
      user = config.servers.kibana.username;
      pwd = config.servers.kibana.password;
      PageObjects.common.log(`${err} \nFailed to find username field, try Auth0 login with ${user}/${pwd}`);
	  try {
		  await remote.setFindTimeout(defaultFindTimeout).findByName('email').type(user);
		  await remote.findByName('password').type(pwd);
		  await remote.findByCssSelector('button[type="submit"]').click();
		  await PageObjects.common.sleep(3800);
	  } catch (err) {
		  PageObjects.common.log(`${err} \nFailed to find Auth0 login page, trying the Auth0 last login page`);
		  await remote.findByCssSelector('.auth0-lock-social-button').click();
		  await PageObjects.common.sleep(3800);
	  }
    }
  }

  async logout() {
    PageObjects.common.log('logging out--------------------------');
    await PageObjects.common.sleep(1001);

    // for left navigation

    await PageObjects.common.findTestSubject('userMenuButton')
    .click();
	    await PageObjects.common.sleep(500);
	await PageObjects.common.findTestSubject('logoutLink')
    .click();

    // for new K7 app menu
    // await this.remote.setFindTimeout(defaultFindTimeout)
    //     .findByCssSelector('#headerUserMenu')
    //     .click();
    //
    // await PageObjects.common.sleep(1111);
    // await this.remote.setFindTimeout(defaultFindTimeout)
    //     .findByCssSelector('.euiLink[href="/logout"]')
    //     .click();
    PageObjects.common.log('found and clicked log out--------------------------');
    await PageObjects.common.sleep(8002);
  }

  async logoutLogin(user,pwd) {
    await this.logout();
    await PageObjects.common.sleep(3002);
    await this.login(user, pwd);
  }
}
