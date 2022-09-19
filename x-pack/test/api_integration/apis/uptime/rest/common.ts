import { SimpleSavedObject } from '@kbn/core-saved-objects-api-browser';
import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SuperTest, Test } from 'supertest';

export async function deleteMonitor(supertest: SuperTest<Test>, id: string, route: string) {
  try {
    await supertest.delete(`${route}/${id}`).set('kbn-xsrf', 'true').expect(200);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

export async function saveMonitor(
  supertest: SuperTest<Test>,
  monitor: MonitorFields,
  route: string
) {
  const res = await supertest.post(route).set('kbn-xsrf', 'true').send(monitor);

  return res.body as SimpleSavedObject<MonitorFields>;
}
