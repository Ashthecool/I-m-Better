// Game flow: title → intro → school (3 days) → report → interlude →
// work (3 days) → review → ending (depends on how many chapters you passed).
(function () {
  'use strict';
  const G = window.G;

  G.run = null;

  G.flow = {
    newGame() {
      G.run = { chapter: 0, day: 0, dayResults: [], chapterOutbursts: 0, results: [] };
      G.goto(() => G.story.intro());
    },
    startChapter() {
      const r = G.run;
      r.day = 0;
      r.dayResults = [];
      r.chapterOutbursts = 0;
      G.flow.startDay();
    },
    startDay() {
      const r = G.run;
      G.goto(() => new G.LevelScene(r.chapter, r.day));
    },
    dayDone(result, kicked) {
      const r = G.run;
      r.dayResults.push(result);
      const ch = G.DATA.chapters[r.chapter];
      if (kicked || r.day >= ch.days.length - 1) {
        const days = r.dayResults.slice();
        G.goto(() => new G.ReportScene(r.chapter, days, kicked));
      } else {
        r.day++;
        G.flow.startDay();
      }
    },
    reportDone(passed) {
      const r = G.run;
      r.results.push(passed);
      if (r.chapter === 0) {
        r.chapter = 1;
        G.goto(() => G.story.interlude(passed));
      } else G.flow.ending();
    },
    ending() {
      const results = G.run.results.slice();
      const wins = results.filter(Boolean).length;
      const key = wins === 0 ? 'bad' : wins === 1 ? 'mixed' : 'both';
      const seen = G.save.get('endings', []);
      if (!seen.includes(key)) G.save.set('endings', seen.concat(key));
      G.goto(() => G.story.ending(key, results));
    },
    toTitle() {
      G.goto(() => new G.TitleScene());
    },
  };
})();
