// All game content: chapters, cast, balancing, dialogue and task pools.
// Placeholders: {you} {rival} {friend} {boss} {o1} {o2}
(function () {
  'use strict';
  const G = window.G;

  const school = {
    id: 'school',
    label: 'Chapter 1',
    title: 'School',
    setting: 'classroom',
    adult: false,
    boss: { name: 'Ms. Hart', dress: '#b9a4d8', hair: 'bun', hairColor: '#6b6460', glasses: true },
    cast: {
      friend: { name: 'Sam', shirt: '#a9d6a0', hair: 'curly', hairColor: '#2a2622' },
      you: { name: 'Alex', shirt: '#9cc0e6', hair: 'messy', hairColor: '#4a3426' },
      rival: { name: 'Max', shirt: '#f2d16b', hair: 'short', hairColor: '#b9802f' },
      o1: { name: 'Lily', shirt: '#efb7c0', hair: 'pony', hairColor: '#6d4128' },
      o2: { name: 'Theo', shirt: '#c8c0ea', hair: 'bob', hairColor: '#2a2622', glasses: true },
    },
    seatX: { friend: 160, you: 430, rival: 680, o1: 930, o2: 1160 },
    bossX: 300,
    stars: { rival: 9, o1: 5, friend: 3, you: 2 },
    // duration (s), praise interval range (s), sting = jealousy per praise,
    // creep = how fast jealousy grows by itself, taskTime = seconds per task,
    // start = starting jealousy, zone/speed = timing-task difficulty,
    // target = score that counts as 100% for the report card.
    days: [
      { name: 'Monday', duration: 60, praise: [8, 12], sting: 11, creep: 0.35, taskTime: 9, start: 8, zone: 0.2, speed: 0.55, target: 84 },
      { name: 'Wednesday', duration: 65, praise: [6.5, 10], sting: 12, creep: 0.5, taskTime: 8, start: 15, zone: 0.17, speed: 0.65, target: 91 },
      { name: 'Exam Day', duration: 70, praise: [5.5, 8.5], sting: 13, creep: 0.65, taskTime: 7.5, start: 22, zone: 0.15, speed: 0.75, target: 98 },
    ],
    tasks: ['math', 'spelling', 'quiz', 'raise', 'diagram'],
    board: ['2x + 3 = 11', 'Photosynthesis', 'FINAL EXAM'],
    tips: [
      'Do your tasks. Other people will get praised — it will sting. If the jealousy bar fills up, you explode.',
      'Thoughts will start getting in the way. Click them to let them go.',
      'Exam day. Everyone is watching. Remember: you can breathe.',
    ],
    praise: {
      rival: [
        'Wonderful, {rival}! Perfect again.',
        "Class, look at {rival}'s work. That's how it's done.",
        '{rival}, you never disappoint!',
        'Gold star for {rival}!',
        'Top of the class, {rival}. As always.',
        '{rival}, would you show everyone how you did that?',
      ],
      sting: [
        "Correct, {you}. ...{rival} got it first though, didn't you? Brilliant!",
        'Fine, {you}. Now {rival} — what a wonderful answer!',
        "Okay. {rival}, yours was excellent though!",
      ],
      you: ['Good job, {you}.', "That's right, {you}.", 'Nice, {you}. Keep it up.'],
      other: [
        ['o1', 'Lovely work, {o1}!'],
        ['o2', 'Great thinking, {o2}!'],
        ['friend', '{friend}, well done!'],
        ['o1', 'Very creative, {o1}.'],
      ],
    },
    dayEnd: [
      "That's all for today. And a special well done to {rival}!",
      'Homework is page 40. {rival}, excellent work today, as always.',
      "Pens down! I'll grade these tonight. ...I already know {rival} aced it.",
    ],
    kickedLine: "That's it, {you}. You're done here.",
    kind: {
      line: 'Hey {you}, that was a good answer earlier.',
      good: 'Oh... thanks, {rival}.',
      bad: 'Is {rival} mocking me?',
    },
    thoughts: [
      'Why always {rival}?', 'I studied all weekend.', 'Nobody even noticed.',
      "I'm better than {rival}.", 'Look at me for once!', "It's not fair.",
      "What's so special about {rival}?", 'Am I invisible?', "I'm better. I'm BETTER.",
    ],
    outbursts: [
      { say: "I'M BETTER THAN YOU!", kind: 'yell', reply: '{you}! Hallway. Now.' },
      { say: '*SLAMS DESK*', kind: 'slam', reply: "That's detention, {you}." },
      { say: '*shoves {rival}*', kind: 'shove', reply: "Principal's office. NOW." },
    ],
    breakLabel: 'Doodle',
    breaks: [
      { text: 'You doodle a little cat in the margin.', art: 'cat', look: 0, lookY: 1 },
      { text: 'You look out the window. A bird lands on the ledge.', art: 'bird', look: 1, lookY: -0.6 },
      { text: "You draw a spaceship. It's a good spaceship.", art: 'ship', look: 0, lookY: 1 },
    ],
    talkLabel: 'Talk to Sam',
    talks: [
      [
        ['friend', "Hey. You okay? You've been glaring at {rival} all morning."],
        ['you', 'Everyone treats {rival} like a genius. I work just as hard.'],
        ['friend', 'I know you do. I see it. That counts for something, right?'],
        ['you', '...Yeah. Maybe it does.'],
      ],
      [
        ['friend', "Psst. Breathe. You're gripping that pencil like it owes you money."],
        ['you', "{boss} doesn't even look at me."],
        ['friend', "Teachers have favourites. It's not a scoreboard of who you are."],
      ],
      [
        ['friend', "Exam day. Whatever happens, I'm getting fries with you after."],
        ['you', 'What if {rival} beats me again?'],
        ['friend', "Then {rival} beats you on one test. You're still you. Still my friend."],
      ],
    ],
    report: {
      title: 'Report Card',
      sub: 'Year 10 — {boss}',
      verdictPass: 'PASSED',
      verdictFail: 'FAILED',
      verdictKicked: 'EXPELLED',
      pass: 'You passed. Not first — but you passed.',
      fail: 'You failed the year.',
      kicked: 'You were expelled after too many outbursts.',
      comment: {
        A: '"Excellent work this year, {you}."',
        B: '"A solid year. Well done, {you}."',
        C: '"{you} can do better when focused."',
        D: '"{you} is often distracted by others."',
        F: '"{you} seems more interested in {rival} than in learning."',
      },
      rival: '{rival} — A+ — Student of the Year',
    },
  };

  const work = {
    id: 'work',
    label: 'Chapter 2',
    title: 'Work',
    setting: 'office',
    adult: true,
    boss: { name: 'Mr. Doyle', shirt: '#8a8f99', hair: 'bald', hairColor: '#6b6460', glasses: true, tie: '#7a3b3b' },
    cast: {
      friend: { name: 'Priya', shirt: '#a9d6a0', hair: 'bob', hairColor: '#2a2622' },
      you: { name: 'Alex', shirt: '#9cc0e6', hair: 'side', hairColor: '#4a3426', lanyard: true },
      rival: { name: 'Jordan', shirt: '#f2d16b', hair: 'short', hairColor: '#b9802f', tie: '#3d6fb6' },
      o1: { name: 'Ken', shirt: '#c8c0ea', hair: 'messy', hairColor: '#2a2622' },
      o2: { name: 'Rosa', shirt: '#efb7c0', hair: 'bun', hairColor: '#6d4128', glasses: true },
    },
    seatX: { friend: 160, you: 430, rival: 680, o1: 930, o2: 1160 },
    bossX: 300,
    stars: { rival: 7 },
    days: [
      { name: 'First Week', duration: 60, praise: [7.5, 11], sting: 12, creep: 0.45, taskTime: 8.5, start: 18, zone: 0.18, speed: 0.6, target: 84 },
      { name: 'Deadline', duration: 65, praise: [6, 9.5], sting: 13, creep: 0.6, taskTime: 8, start: 24, zone: 0.16, speed: 0.7, target: 91 },
      { name: 'Review Day', duration: 70, praise: [5, 8], sting: 14, creep: 0.75, taskTime: 7.5, start: 30, zone: 0.14, speed: 0.8, target: 98 },
    ],
    tasks: ['email', 'sheet', 'calendar', 'pitch', 'macro'],
    board: ['Q3 GOALS', 'DEADLINE: TODAY', 'REVIEWS'],
    tips: [
      'New job. Same feeling. Same tools: breathe, take a break, talk to someone.',
      'Three outbursts and you are fired.',
      'Review day. Do well — but don\'t lose yourself.',
    ],
    praise: {
      rival: [
        '{rival}, that client loved you. Fantastic!',
        'Everyone — {rival} closed the Henderson deal!',
        '{rival}, the board was impressed. Again.',
        "This is why {rival}'s getting the big office.",
        "{rival}! Coffee's on me today.",
        'Can we all be a bit more like {rival}?',
      ],
      sting: [
        'Got your email, {you}. Hey {rival} — your deck was incredible!',
        "Sure, {you}. {rival}, you're a lifesaver!",
        'Thanks {you}. {rival} already sent theirs, but thanks.',
      ],
      you: ['Thanks, {you}.', 'Good work, {you}.', "{you}, that's... fine. Good."],
      other: [
        ['o1', 'Nice report, {o1}.'],
        ['o2', '{o2}, great call on the budget.'],
        ['friend', '{friend}, thanks for covering.'],
        ['o2', 'Love the energy, {o2}!'],
      ],
    },
    dayEnd: [
      "Good week, team. Drinks on me — {rival}, you've earned it.",
      "Before you go: let's hear it for {rival}!",
      '{rival}, my office. We need to talk about that promotion.',
    ],
    kickedLine: '{you}. Clear your desk.',
    kind: {
      line: 'Nice work on that report, {you}. Seriously.',
      good: 'Oh. Thanks, {rival}.',
      bad: 'Is {rival} being sarcastic?',
    },
    thoughts: [
      'I stayed late all week.', '{rival} just talks louder.', 'Do they even know my name?',
      'That was MY idea.', "I'm better than {rival}.", 'Why do I even try?',
      'Same as school. Same as always.', 'Notice me. Please.', 'Promoted? {rival}? Really?',
    ],
    outbursts: [
      { say: 'THAT WAS MY IDEA!', kind: 'yell', reply: '{you}! My office. Now.' },
      { say: '*SLAMS KEYBOARD*', kind: 'slam', reply: 'Is there a problem, {you}?' },
      { say: '*shoves {rival}*', kind: 'shove', reply: 'Security. ...Pack your desk.' },
    ],
    breakLabel: 'Coffee break',
    breaks: [
      { text: 'You make a coffee and watch the milk swirl.', art: 'coffee', look: 0, lookY: 1 },
      { text: 'You look out at the city. Everything keeps moving.', art: 'city', look: 1, lookY: -0.6 },
      { text: 'You stretch. Your shoulders were up by your ears.', art: 'stretch', look: 0, lookY: -1 },
    ],
    talkLabel: 'Talk to Priya',
    talks: [
      [
        ['friend', "First week? {boss}'s like that with everyone except {rival}. Don't take it personally."],
        ['you', "It's school all over again."],
        ['friend', "Then let's do it differently this time. Lunch?"],
      ],
      [
        ['friend', 'You okay? You sighed so loud the printer jammed.'],
        ['you', "I keep thinking if I'm just a bit better, someone will notice."],
        ['friend', "I notice. And honestly? You don't have to win every room."],
      ],
      [
        ['friend', "Review day. Deep breath. You've done good work."],
        ['you', '{rival} will get the promotion anyway.'],
        ['friend', "Maybe. And you'll still go home, call your mom, eat something nice. Life's bigger than this office."],
      ],
    ],
    report: {
      title: 'Performance Review',
      sub: 'Annual review — {boss}',
      verdictPass: 'KEPT JOB',
      verdictFail: 'LET GO',
      verdictKicked: 'FIRED',
      pass: 'You kept your job. Not employee of the year — but you kept it.',
      fail: 'You were let go.',
      kicked: 'You were fired for your outbursts.',
      comment: {
        A: '"Strong year, {you}. Really."',
        B: '"Reliable. Good to have you, {you}."',
        C: '"Meets expectations. Mostly."',
        D: '"{you} seems distracted by colleagues."',
        F: '"{you} spends more time watching {rival} than working."',
      },
      rival: '{rival} — Promoted — Employee of the Year',
    },
  };

  G.DATA = {
    chapters: [school, work],
    content: {
      spelling: [
        ['necessary', 'neccessary', 'necesary'], ['definitely', 'definately', 'defenitely'],
        ['separate', 'seperate', 'separrate'], ['rhythm', 'rythm', 'rhythym'],
        ['beginning', 'begining', 'beggining'], ['tomorrow', 'tommorow', 'tomorow'],
        ['believe', 'beleive', 'belive'], ['embarrass', 'embarass', 'embarras'],
        ['occurred', 'occured', 'ocurred'], ['library', 'libary', 'liberry'],
        ['weird', 'wierd', 'weerd'], ['calendar', 'calender', 'calandar'],
      ],
      quiz: [
        ['Capital of France?', 'Paris', 'Lyon', 'Nice'],
        ['H2O is...', 'Water', 'Salt', 'Oxygen'],
        ['Largest planet?', 'Jupiter', 'Saturn', 'Mars'],
        ['How many continents?', '7', '5', '9'],
        ['Fastest land animal?', 'Cheetah', 'Horse', 'Lion'],
        ['Plants make food by...', 'Photosynthesis', 'Digestion', 'Erosion'],
        ['Who wrote Romeo & Juliet?', 'Shakespeare', 'Dickens', 'Austen'],
        ['Water freezes at...', '0°C', '10°C', '-10°C'],
        ['Closest star to Earth?', 'The Sun', 'Sirius', 'Polaris'],
        ['Square root of 81?', '9', '8', '7'],
        ['Longest river?', 'The Nile', 'The Thames', 'The Seine'],
        ['A triangle has ___ sides', '3', '4', '6'],
      ],
      email: [
        ["Client: 'The invoice is wrong!'", 'Apologise & fix it', 'Ignore it', 'Blame accounting'],
        ["{boss}: 'Slides by 3pm.'", 'On it — sending at 2:30', "Reply 'k'", 'Ask {rival} to do it'],
        ["'IT': 'Send us your password.'", 'Report it as phishing', 'Send the password', 'Reply to ask why'],
        ["Client: 'Can we move the meeting?'", 'Offer two new times', 'Say no', "Don't reply"],
        ["HR: 'Timesheets due today.'", 'Fill it in now', 'Leave it till Friday', 'Delete the email'],
        ["Client: 'We love the work!'", 'Thank them warmly', 'Reply-all to the company', 'Ignore it'],
        ["{boss}: 'Who missed the deadline?'", 'Own up & fix it', 'Blame {rival}', 'Pretend you are sick'],
      ],
    },
  };
})();
