import { Prop, Toggle, propWithEffect, toggle } from 'common';
import * as licon from 'common/licon';
import { bind, dataIcon, onInsert } from 'common/snabbdom';
import { snabDialog } from 'common/dialog';
import { h, VNode } from 'snabbdom';
import { Redraw } from '../interfaces';
import { ChapterPreview } from './interfaces';
import { StudyChapters } from './studyChapters';

export class SearchCtrl {
  open: Toggle;
  query: Prop<string> = propWithEffect('', this.redraw);

  constructor(
    readonly studyName: string,
    readonly chapters: StudyChapters,
    readonly rootSetChapter: (id: string) => void,
    readonly redraw: Redraw,
  ) {
    this.open = toggle(false, () => this.query(''));
    site.pubsub.on('study.search.open', () => this.open(true));
  }

  cleanQuery = () => this.query().toLowerCase().trim();

  results = () => {
    const q = this.cleanQuery();
    return q ? this.chapters.all().filter(this.match(q)) : this.chapters.all();
  };

  setChapter = (id: string) => {
    this.rootSetChapter(id);
    this.open(false);
    this.query('');
  };

  setFirstChapter = () => {
    const c = this.results()[0];
    if (c) this.setChapter(c.id);
  };

  private tokenize = (c: ChapterPreview) => c.name.toLowerCase().split(' ');

  private match = (q: string) => (c: ChapterPreview) =>
    q.includes(' ') ? c.name.toLowerCase().includes(q) : this.tokenize(c).some(t => t.startsWith(q));
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

export function view(ctrl: SearchCtrl) {
  const cleanQuery = ctrl.cleanQuery();
  const highlightRegex = cleanQuery && new RegExp(escapeRegExp(cleanQuery), 'gi');
  return snabDialog({
    class: 'study-search',
    onClose() {
      ctrl.open(false);
    },
    vnodes: [
      h('input', {
        attrs: { autofocus: 1, placeholder: `Search in ${ctrl.studyName}`, value: ctrl.query() },
        hook: onInsert((el: HTMLInputElement) => {
          el.addEventListener('input', (e: KeyboardEvent) =>
            ctrl.query((e.target as HTMLInputElement).value.trim()),
          );
          el.addEventListener('keydown', (e: KeyboardEvent) => e.key == 'Enter' && ctrl.setFirstChapter());
        }),
      }),
      h(
        // dynamic extra class necessary to fully redraw the results and produce innerHTML
        `div.study-search__results.search-query-${cleanQuery}`,
        ctrl.results().map(c =>
          h('div', { hook: bind('click', () => ctrl.setChapter(c.id)) }, [
            h(
              'h3',
              {
                hook: highlightRegex
                  ? {
                    insert(vnode: VNode) {
                      const el = vnode.elm as HTMLElement;
                      el.innerHTML = c.name.replace(highlightRegex, '<high>$&</high>');
                    },
                  }
                  : {},
              },
              c.name,
            ),
            c.playing
              ? h('ongoing', { attrs: { ...dataIcon(licon.DiscBig), title: 'Ongoing' } })
              : c.status && h('res', c.status),
          ]),
        ),
      ),
    ],
  });
}
