import expect from '@kbn/expect';
import fetch from 'node-fetch';
import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { createServer } from '@mswjs/http-middleware';
import { getInterceptedRequestBody } from './usage.handler.mock';

let interceptedRequestBody: any = null;

export default function ({ getService }: FtrProviderContext) {
  const server = createServer(
    http.post('/user', async ({ request }) => {
      console.log('Intercepted request to /user');
      const payload = await request.clone().text();
      console.log(await request.clone().text());
      interceptedRequestBody = payload;
      return HttpResponse.json({
        id: '15d42a4d-1948-4de4-ba78-b8a893feaf45',
        firstName: 'John',
        response: payload,
      });
    })
  );

  const retry = getService('retry');

  describe('fetch usage api response benchmark', function () {
    before(async () => {
      server.listen(8081);
      console.log('Mock server is running');
    });

    after(async () => {
      // server.close();
      console.log('Mock server is stopped');
    });

    beforeEach(() => {
      // server.resetHandlers();
    });

    it('Should intercept and review the usage API request body', async () => {
      // const response = await fetch('http://localhost:8081/user', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ usage: 'data' }),
      // });
      // // Wait for the server to process the request
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      // // Check the response
      // const json = await response.json();
      // expect(json).to.have.property('id', '15d42a4d-1948-4de4-ba78-b8a893feaf45');
      // expect(json).to.have.property('firstName', 'John');

      await new Promise(() => {});

      // await retry.try(async () => {
      //   // interceptedRequestBody = getInterceptedRequestBody();
      //   console.log('Intercepted request body: ', interceptedRequestBody);
      //   expect(interceptedRequestBody).not.to.be(null);
      // });
    });
  });
}
