// Boot. Dev shortcuts: add ?chapter=1&day=2 to the URL to jump straight in,
// or ?ending=bad|mixed|both to preview an ending.
(function () {
  'use strict';
  const G = window.G;
  const q = new URLSearchParams(location.search);

  G.start(() => {
    if (q.has('ending')) {
      const key = q.get('ending');
      const results = key === 'both' ? [true, true] : key === 'mixed' ? [true, false] : [false, false];
      G.run = { chapter: 1, day: 0, dayResults: [], chapterOutbursts: 0, results };
      return G.story.ending(key, results);
    }
    if (q.has('chapter') || q.has('day')) {
      G.run = {
        chapter: Number(q.get('chapter') || 0),
        day: Number(q.get('day') || 0),
        dayResults: [], chapterOutbursts: 0, results: [true],
      };
      return new G.LevelScene(G.run.chapter, G.run.day);
    }
    return new G.TitleScene();
  });
})();
