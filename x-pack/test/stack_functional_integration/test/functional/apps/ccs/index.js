import { bdd, defaultTimeout } from '../../../support';

bdd.describe('ccs test', function () {
  this.timeout = defaultTimeout;

  require('./_ccs');

});
