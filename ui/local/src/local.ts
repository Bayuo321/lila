import { attributesModule, classModule, init } from 'snabbdom';
//import { RoundOpts, RoundData, RoundSocket } from 'round';
import { MoveRootCtrl } from 'game';
import { PlayCtrl } from './playCtrl';
import { TestCtrl } from './testCtrl';
import { renderTestView } from './testView';
import { LocalPlayOpts } from './interfaces';
import { BotCtrl } from './botCtrl';
import { LocalDialog } from './setupDialog';
import makeZerofish from 'zerofish';
import { makeDatabase, Database } from './database';
//import { objectStorage } from 'common/objectStorage';
import view from './playView';

const patch = init([classModule, attributesModule]);

export async function initModule(opts: LocalPlayOpts) {
  //const db: Database = await makeDatabase(2);

  const [zf, bots, db] = await Promise.all([
    makeZerofish({
      root: site.asset.url('npm', { documentOrigin: true }),
      wasm: site.asset.url('npm/zerofishEngine.wasm'),
      maxZeros: 2,
    }),
    fetch(site.asset.url('bots.json')).then(x => x.json()),
    makeDatabase(2),
  ]);

  const botCtrl = new BotCtrl(bots, zf, db);
  if (opts.setup) {
    if (!opts.setup.go) {
      new LocalDialog(bots, opts.setup, true);
      return;
    }
    botCtrl.setBot('white', opts.setup.white);
    botCtrl.setBot('black', opts.setup.black);
  }

  const ctrl = new PlayCtrl(opts, botCtrl, redraw);
  const testCtrl = opts.testUi && new TestCtrl(ctrl, redraw);
  const el = document.createElement('main');
  document.getElementById('main-wrap')?.appendChild(el);
  const renderSide = testCtrl ? () => renderTestView(testCtrl) : () => undefined;
  let vnode = patch(el, view(ctrl, renderSide()));

  ctrl.round = await site.asset.loadEsm<MoveRootCtrl>('round', { init: ctrl.roundOpts });

  redraw();

  function redraw() {
    vnode = patch(vnode, view(ctrl, renderSide()));
    ctrl.round.redraw();
  }
}

// async stuff that must be serialized is done so here
/*const localCode = navigator.language;
  let i18n = opts.i18n;
  try {
    const store = await objectStorage<any>({ db: 'i18n', store: `local` });
    if (i18n) await store.put(localCode, i18n);
    else i18n = await store.get(localCode);
  } catch (e) {
    console.log('oh noes!', e);
  }*/
