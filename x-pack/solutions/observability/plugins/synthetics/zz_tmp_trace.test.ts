import Module from 'module';

it('trace', async () => {
  const M = Module as unknown as { _load: (...a: unknown[]) => unknown };
  const orig = M._load;
  M._load = function (request: unknown, parent: { filename?: string } | undefined, ...rest: unknown[]) {
    // eslint-disable-next-line no-console
    console.log('REQ', request, 'FROM', parent?.filename);
    return orig.call(this, request, parent, ...rest);
  };
  try {
    await import('@kbn/observability-shared-plugin/public');
    // eslint-disable-next-line no-console
    console.log('obs shared OK');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('STACK2', e.stack, e.code);
  }
}, 600000);
