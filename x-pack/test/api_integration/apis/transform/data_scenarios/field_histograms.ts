/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';


import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/transform/security_common';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');


  const testData = {
      user: USER.TRANSFORM_POWERUSER,
      requestBody: {
        query: { bool: { must: [{ match_all: {} }] } },
        "fields": [
          {
            "fieldName": "bottle_volume_ml",
            "type": "number"
          },
          {
            "fieldName": "city",
            "type": "string"
          },
          {
            "fieldName": "date",
            "type": "date"
          }
        ],
        "samplerShardSize": 5000,
      },
      expected: {
        responseCode: 200,
        responseBody: [
          {
            "data": [
              {
                "key": 0,
                "doc_count": 4971
              },
              {
                "key": 471.05263157894734,
                "doc_count": 17445
              },
              {
                "key": 942.1052631578947,
                "doc_count": 5023
              },
              {
                "key": 1413.157894736842,
                "doc_count": 7174
              },
              {
                "key": 1884.2105263157894,
                "doc_count": 2
              },
              {
                "key": 2355.2631578947367,
                "doc_count": 7
              },
              {
                "key": 2826.315789473684,
                "doc_count": 375
              },
              {
                "key": 3297.368421052631,
                "doc_count": 0
              },
              {
                "key": 3768.4210526315787,
                "doc_count": 0
              },
              {
                "key": 4239.473684210526,
                "doc_count": 0
              },
              {
                "key": 4710.526315789473,
                "doc_count": 0
              },
              {
                "key": 5181.578947368421,
                "doc_count": 0
              },
              {
                "key": 5652.631578947368,
                "doc_count": 2
              },
              {
                "key": 6123.684210526316,
                "doc_count": 0
              },
              {
                "key": 6594.736842105262,
                "doc_count": 0
              },
              {
                "key": 7065.78947368421,
                "doc_count": 0
              },
              {
                "key": 7536.8421052631575,
                "doc_count": 0
              },
              {
                "key": 8007.894736842105,
                "doc_count": 0
              },
              {
                "key": 8478.947368421052,
                "doc_count": 0
              },
              {
                "key": 8950,
                "doc_count": 1
              }
            ],
            "interval": 471.05263157894734,
            "stats": [
              50,
              9000
            ],
            "type": "numeric",
            "id": "bottle_volume_ml"
          },
          {
            "type": "ordinal",
            "cardinality": 378,
            "data": [
              {
                "key": "des moines",
                "doc_count": 3471
              },
              {
                "key": "cedar rapids",
                "doc_count": 1907
              },
              {
                "key": "davenport",
                "doc_count": 1414
              },
              {
                "key": "sioux city",
                "doc_count": 1347
              },
              {
                "key": "council bluffs",
                "doc_count": 1184
              },
              {
                "key": "ames",
                "doc_count": 1147
              },
              {
                "key": "west des moines",
                "doc_count": 996
              },
              {
                "key": "iowa city",
                "doc_count": 952
              },
              {
                "key": "waterloo",
                "doc_count": 880
              },
              {
                "key": "mason city",
                "doc_count": 748
              },
              {
                "key": "dubuque",
                "doc_count": 605
              },
              {
                "key": "ankeny",
                "doc_count": 577
              },
              {
                "key": "cedar falls",
                "doc_count": 571
              },
              {
                "key": "muscatine",
                "doc_count": 515
              },
              {
                "key": "coralville",
                "doc_count": 465
              },
              {
                "key": "marshalltown",
                "doc_count": 399
              },
              {
                "key": "newton",
                "doc_count": 378
              },
              {
                "key": "fort dodge",
                "doc_count": 339
              },
              {
                "key": "urbandale",
                "doc_count": 337
              },
              {
                "key": "clinton",
                "doc_count": 313
              }
            ],
            "id": "city"
          },
          {
            "data": [
              {
                "key_as_string": "11/07/2011",
                "key": 1320692210526.3157,
                "doc_count": 857
              },
              {
                "key_as_string": "03/08/2012",
                "key": 1331173894736.842,
                "doc_count": 1680
              },
              {
                "key_as_string": "07/07/2012",
                "key": 1341655578947.3684,
                "doc_count": 1646
              },
              {
                "key_as_string": "11/05/2012",
                "key": 1352137263157.8948,
                "doc_count": 1689
              },
              {
                "key_as_string": "03/07/2013",
                "key": 1362618947368.4211,
                "doc_count": 1617
              },
              {
                "key_as_string": "07/06/2013",
                "key": 1373100631578.9473,
                "doc_count": 1666
              },
              {
                "key_as_string": "11/04/2013",
                "key": 1383582315789.4736,
                "doc_count": 1670
              },
              {
                "key_as_string": "03/06/2014",
                "key": 1394064000000,
                "doc_count": 1585
              },
              {
                "key_as_string": "07/05/2014",
                "key": 1404545684210.5264,
                "doc_count": 1691
              },
              {
                "key_as_string": "11/03/2014",
                "key": 1415027368421.0527,
                "doc_count": 1760
              },
              {
                "key_as_string": "03/04/2015",
                "key": 1425509052631.5789,
                "doc_count": 1893
              },
              {
                "key_as_string": "07/04/2015",
                "key": 1435990736842.1052,
                "doc_count": 1830
              },
              {
                "key_as_string": "11/02/2015",
                "key": 1446472421052.6316,
                "doc_count": 1076
              },
              {
                "key_as_string": "03/02/2016",
                "key": 1456954105263.158,
                "doc_count": 1981
              },
              {
                "key_as_string": "07/02/2016",
                "key": 1467435789473.684,
                "doc_count": 636
              },
              {
                "key_as_string": "10/31/2016",
                "key": 1477917473684.2104,
                "doc_count": 6086
              },
              {
                "key_as_string": "03/01/2017",
                "key": 1488399157894.7368,
                "doc_count": 159
              },
              {
                "key_as_string": "07/01/2017",
                "key": 1498880842105.2632,
                "doc_count": 319
              },
              {
                "key_as_string": "10/30/2017",
                "key": 1509362526315.7896,
                "doc_count": 2077
              },
              {
                "key_as_string": "02/28/2018",
                "key": 1519844210526.3157,
                "doc_count": 3082
              }
            ],
            "interval": 10481684210.526316,
            "stats": [
              1325548800000,
              1524700800000
            ],
            "type": "numeric",
            "id": "date"
          }
        ],
      },
    };

  describe('/api/transform/field_histograms', function () {
    before(async () => {
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    it('should return a field_histograms', async () => {
      const { body, status } = await supertest
        .post('/api/transform/field_histograms/iowa*')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(testData.requestBody);
      transform.api.assertResponseStatusCode(200, status, body);

      expect(body).to.eql(testData.expected.responseBody);
    });

  });

};
