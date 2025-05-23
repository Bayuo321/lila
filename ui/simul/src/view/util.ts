import { h } from 'snabbdom';

import type { Player } from '../interfaces';
import type SimulCtrl from '../ctrl';
import { fullName, userLine, userRating } from 'lib/view/userLink';

export function player(p: Player, ctrl: SimulCtrl) {
  return h(
    'a.ulpt.user-link.' + (p.online || ctrl.data.host.id !== p.id ? 'online' : 'offline'),
    {
      attrs: { href: '/@/' + p.name },
      hook: { destroy: vnode => $.powerTip.destroy(vnode.elm as HTMLElement) },
    },
    [
      userLine({ line: true, ...p }),
      h('span.name', fullName(p)),
      ctrl.opts.showRatings ? h('em', userRating(p)) : null,
    ],
  );
}

export const title = (ctrl: SimulCtrl) => h('h1', ctrl.data.fullName);
