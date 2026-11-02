// stories.js — the built-in stories.
// Text uses [type:key] for blanks and {key} to reuse an earlier answer.
// Each step's ops run in order; an op waits until the blank it uses is filled,
// so the cartoon reacts the moment each word comes in.
(function () {
  const W = Places.W;
  const hero = (x) => [{ op: 'add', id: 'hero', thing: 'person', x: -60 }, { op: 'walk', who: 'hero', x: x || 250 }];

  const TYPES = {
    name: { ask: 'a NAME', hint: 'anyone at all — "Captain Wiggles", "Grandma", your teacher…', ideas: ['Captain Wiggles', 'Sir Noodle', 'Pickle', 'Princess Spaghetti', 'Dr. Banana', 'Pirate Pete', 'Gary', 'Queen Waffles', 'Señor Pants', 'Bob'] },
    noun: { ask: 'a NOUN', hint: 'a thing — like "rocket", "toilet" or "pizza"', ideas: ['tree', 'toilet', 'pizza', 'rocket', 'banana', 'castle', 'robot', 'balloon', 'bomb', 'snowman', 'car', 'cake', 'guitar', 'cactus', 'ufo'] },
    animal: { ask: 'an ANIMAL', hint: 'any creature — "llama", "dragon", "goldfish"…', ideas: ['dragon', 'giraffe', 'penguin', 'unicorn', 'shark', 'dinosaur', 'elephant', 'octopus', 'chicken', 'cat', 'pig', 'frog', 'monster', 'bear', 'duck'] },
    food: { ask: 'a FOOD', hint: 'something to eat — "taco", "broccoli", "cheese"…', ideas: ['pizza', 'banana', 'taco', 'donut', 'ice cream', 'cheese', 'burger', 'carrot', 'apple', 'cake', 'egg', 'pickle'] },
    plural: { ask: 'a PLURAL NOUN', hint: 'more than one thing — "pickles", "ducks"…', ideas: ['pickles', 'donuts', 'ducks', 'balloons', 'socks', 'cupcakes', 'bananas', 'frogs', 'tacos', 'stars', 'rocks', 'eggs'] },
    verb: { ask: 'a VERB', hint: 'an action — "explode", "dance", "eat", "fly"…', ideas: ['explode', 'dance', 'fly', 'melt', 'sneeze', 'spin', 'burp', 'cry', 'sing', 'fall over', 'teleport', 'catch fire', 'freeze', 'multiply', 'shrink', 'grow', 'toot', 'backflip', 'laugh', 'sleep', 'scream', 'bounce'] },
    adjective: { ask: 'an ADJECTIVE', hint: 'a describing word — "sparkly", "enormous", "stinky"…', ideas: ['sparkly', 'enormous', 'stinky', 'tiny', 'furry', 'angry', 'invisible', 'spicy', 'rainbow', 'upside-down', 'wobbly', 'spooky', 'cool', 'frozen', 'electric', 'sad', 'silly', 'fluffy'] },
    color: { ask: 'a COLOR', hint: 'any color — "purple", "rainbow", "gold"…', ideas: ['purple', 'rainbow', 'gold', 'green', 'pink', 'blue', 'orange', 'red', 'black', 'silver'] },
    place: { ask: 'a PLACE', hint: 'anywhere — "the moon", "a volcano", "Grandma\'s house"…', ideas: ['the moon', 'the beach', 'a volcano', 'under the sea', 'candy land', 'the North Pole', 'the desert', 'a castle', 'the city', 'the jungle', 'a farm', 'school'] },
    sound: { ask: 'a SOUND', hint: 'a noise or exclamation — "KABOOM", "boing", "yee-haw"…', ideas: ['KABOOM', 'boing', 'yee-haw', 'bloop', 'cowabunga', 'wahoo', 'splat', 'zoinks', 'moo', 'pew pew', 'ka-chow', 'yikes', 'sproing', 'bazinga'] },
    adverb: { ask: 'an ADVERB', hint: 'how something is done — "quickly", "loudly"…', ideas: ['quickly', 'loudly', 'slowly', 'wildly', 'sneakily', 'happily'] },
    number: { ask: 'a NUMBER', hint: 'any number', ideas: ['7', '42', '1,000', 'a zillion', '3'] },
    word: { ask: 'a WORD', hint: 'anything you like', ideas: ['banana', 'wiggle', 'pants', 'noodle'] },
  };

  const STORIES = [
    {
      id: 'park', title: 'The Thing in the Park', blurb: 'A walk in the park goes very, very wrong.', place: 'park', icon: 'tree',
      setup: hero(240),
      steps: [
        { text: 'Once upon a time, a stick person named [name:name] went for a walk in the park.', ops: [{ op: 'name', who: 'hero', key: 'name' }] },
        { text: 'In the middle of the park stood a gigantic [noun:thing].', ops: [{ op: 'spawn', key: 'thing', x: 650, scale: 1.3 }] },
        { text: 'Suddenly, the {thing} began to [verb:v1]!', ops: [{ op: 'act', who: 'thing', key: 'v1' }] },
        { text: '{name} was so [adjective:a1] that they started to [verb:v2].', ops: [{ op: 'mod', who: 'hero', key: 'a1' }, { op: 'act', who: 'hero', key: 'v2' }] },
        { text: 'Just then, a [animal:pet] fell out of the sky and landed right next to {name}!', ops: [{ op: 'spawn', key: 'pet', x: 450, from: 'sky' }] },
        {
          text: 'The {pet} yelled "[sound:s1]!" and ran all the way to [place:p1].',
          ops: [
            { op: 'say', who: 'pet', key: 's1' },
            { op: 'par', after: 'p1', ops: [{ op: 'walk', who: 'pet', x: W + 160, speed: 420 }, { op: 'walk', who: 'hero', x: W + 120, speed: 360 }] },
            { op: 'place', key: 'p1' },
            { op: 'hide', who: 'thing' },
            { op: 'move', who: ['pet', 'hero'], x: -120 },
            { op: 'par', ops: [{ op: 'walk', who: 'pet', x: 560, speed: 380 }, { op: 'walk', who: 'hero', x: 300, speed: 300 }] },
          ],
        },
        { text: 'There, they met a [adjective:a2] [noun:thing2] who wanted to be friends.', ops: [{ op: 'spawn', key: 'thing2', adj: 'a2', x: 780, alive: true }] },
        { text: 'So they all [verb:v3] together until the sun went down. THE END!', ops: [{ op: 'act', who: 'all', key: 'v3' }, { op: 'confetti' }] },
      ],
    },
    {
      id: 'space', title: 'Blast Off!', blurb: 'Build a rocket, pack a pet, and go somewhere weird.', place: 'park', icon: 'rocket',
      setup: [...hero(230), { op: 'add', id: 'rocket', thing: 'rocket', x: 640, pop: true }],
      steps: [
        { text: '[name:name] built a rocket ship in the backyard and painted it [color:c1].', ops: [{ op: 'name', who: 'hero', key: 'name' }, { op: 'mod', who: 'rocket', key: 'c1' }] },
        { text: 'For good luck, they packed their pet [animal:pet].', ops: [{ op: 'spawn', key: 'pet', x: 420, from: 'left' }] },
        {
          text: '3… 2… 1… [sound:s1]!',
          ops: [
            { op: 'par', ops: [{ op: 'walk', who: 'hero', x: 640 }, { op: 'walk', who: 'pet', x: 640 }] },
            { op: 'hide', who: ['hero', 'pet'] },
            { op: 'burst', key: 's1' },
            { op: 'launch', who: 'rocket' },
          ],
        },
        {
          text: 'They landed on [place:p1], where everything was [adjective:a1].',
          ops: [
            { op: 'place', key: 'p1' },
            { op: 'show', who: 'rocket' },
            { op: 'launch', who: 'rocket', dir: 'down' },
            { op: 'show', who: ['hero', 'pet'], x: 640 },
            { op: 'par', ops: [{ op: 'walk', who: 'hero', x: 300 }, { op: 'walk', who: 'pet', x: 450 }] },
            { op: 'mod', who: 'all', key: 'a1' },
          ],
        },
        { text: 'A friendly alien waddled over and began to [verb:v1].', ops: [{ op: 'add', id: 'alien', thing: 'alien', x: W + 60 }, { op: 'walk', who: 'alien', x: 800, face: -1 }, { op: 'bubble', who: 'alien', text: 'Greetings, earthling!' }, { op: 'act', who: 'alien', key: 'v1' }] },
        { text: '{name} tried it too, but accidentally [verb:v2] instead!', ops: [{ op: 'act', who: 'hero', key: 'v2' }] },
        { text: 'The alien laughed so hard it turned into a [noun:t2].', ops: [{ op: 'verb', who: 'alien', verb: 'laugh' }, { op: 'become', who: 'alien', key: 't2' }] },
        { text: 'Then everybody flew home and ate [plural:snack] for dinner. THE END!', ops: [{ op: 'place', place: 'park', after: 'snack' }, { op: 'hide', who: 'rocket' }, { op: 'spawn', key: 'snack', x: 560, plural: true }, { op: 'verb', who: 'hero', verb: 'eat', target: 'snack' }, { op: 'confetti' }] },
      ],
    },
    {
      id: 'beach', title: 'Beach Day', blurb: 'Sandcastles, a suspicious wave, and something in the water.', place: 'beach', icon: 'wave',
      setup: hero(220),
      steps: [
        { text: 'On a sunny day, [name:name] went to the beach with a [noun:toy].', ops: [{ op: 'name', who: 'hero', key: 'name' }, { op: 'spawn', key: 'toy', x: 340, scale: 0.6 }] },
        { text: 'They built a sandcastle and stuck a [noun:top] on the very top.', ops: [{ op: 'add', id: 'castle', thing: 'castle', x: 640, color: '#f0d79a', pop: true, scale: 0.9 }, { op: 'spawn', key: 'top', x: 640, alt: 186, scale: 0.55 }] },
        { text: 'Suddenly, a [adjective:a1] wave came crashing onto the shore!', ops: [{ op: 'add', id: 'wave', thing: 'wave', x: W + 140, after: 'a1', alive: true }, { op: 'mod', who: 'wave', key: 'a1' }, { op: 'walk', who: 'wave', x: -260, speed: 480 }, { op: 'hide', who: 'wave' }] },
        { text: 'The sandcastle took one look at the wave and began to [verb:v1].', ops: [{ op: 'act', who: 'castle', key: 'v1' }] },
        { text: 'Out of the water popped a [animal:sea] wearing sunglasses!', ops: [{ op: 'spawn', key: 'sea', x: 800 }, { op: 'acc', who: 'sea', acc: 'sunglasses' }] },
        { text: 'It shouted "[sound:s1]!" and started to [verb:v2].', ops: [{ op: 'say', who: 'sea', key: 's1' }, { op: 'act', who: 'sea', key: 'v2' }] },
        { text: '{name} was so [adjective:a2] that they [verb:v3] all the way home. THE END!', ops: [{ op: 'mod', who: 'hero', key: 'a2' }, { op: 'act', who: 'hero', key: 'v3' }, { op: 'confetti' }] },
      ],
    },
    {
      id: 'party', title: 'Birthday Bash', blurb: 'The cake has opinions. The present is alive.', place: 'party', icon: 'cake',
      setup: [...hero(240), { op: 'add', id: 'pal', thing: 'person', x: 430, hat: 'party', dir: -1 }],
      steps: [
        { text: 'It was [name:name]\'s birthday, and the whole town came to the party.', ops: [{ op: 'name', who: 'hero', key: 'name' }, { op: 'acc', who: 'hero', acc: 'party' }] },
        { text: 'The birthday cake was shaped like a [noun:cake].', ops: [{ op: 'spawn', key: 'cake', x: 650 }] },
        { text: 'When everyone sang, the {cake} started to [verb:v1]!', ops: [{ op: 'par', ops: [{ op: 'verb', who: 'hero', verb: 'sing' }, { op: 'verb', who: 'pal', verb: 'sing' }] }, { op: 'act', who: 'cake', key: 'v1' }] },
        { text: 'Then a present began to wiggle… and out jumped a [adjective:a1] [animal:gift]!', ops: [{ op: 'add', id: 'box', thing: 'present', x: 840, pop: true }, { op: 'verb', who: 'box', verb: 'shake' }, { op: 'verb', who: 'box', verb: 'vanish', after: 'gift' }, { op: 'spawn', key: 'gift', adj: 'a1', x: 820 }] },
        { text: 'The {gift} immediately [verb:v2] all over the room.', ops: [{ op: 'act', who: 'gift', key: 'v2' }] },
        { text: '{name} laughed so hard they turned [color:c1].', ops: [{ op: 'verb', who: 'hero', verb: 'laugh' }, { op: 'mod', who: 'hero', key: 'c1' }] },
        { text: 'Best. Birthday. EVER. Everybody shouted "[sound:s1]!" THE END!', ops: [{ op: 'burst', key: 's1' }, { op: 'confetti' }, { op: 'verb', who: 'all', verb: 'dance' }] },
      ],
    },
    {
      id: 'kitchen', title: 'Monster in the Kitchen', blurb: 'Something is living in the fridge. It is hungry.', place: 'kitchen', icon: 'monster',
      setup: hero(300),
      steps: [
        { text: '[name:name] was making a [food:food] sandwich for lunch.', ops: [{ op: 'name', who: 'hero', key: 'name' }, { op: 'spawn', key: 'food', x: 430, alt: 134, scale: 0.55 }] },
        { text: 'Then the fridge door creaked open, and out crawled a [adjective:a1] monster!', ops: [{ op: 'add', id: 'monster', thing: 'monster', x: 825, pop: true, after: 'a1', dir: -1 }, { op: 'mod', who: 'monster', key: 'a1' }, { op: 'walk', who: 'monster', x: 660, face: -1 }] },
        { text: 'The monster\'s favorite food was [plural:snacks], and it wanted some NOW.', ops: [{ op: 'bubble', who: 'monster', text: 'FEED ME!', wait: 0.6 }, { op: 'spawn', key: 'snacks', x: 520, plural: true }, { op: 'verb', who: 'monster', verb: 'eat', target: 'snacks' }] },
        { text: '{name} grabbed a [noun:tool] to protect the sandwich.', ops: [{ op: 'spawn', key: 'tool', x: 370, scale: 0.6 }, { op: 'bubble', who: 'hero', text: 'Stay back!' }] },
        { text: 'But the monster just smiled and started to [verb:v1].', ops: [{ op: 'act', who: 'monster', key: 'v1' }] },
        { text: '"[sound:s1]!" said {name}. "Fine… you can have half."', ops: [{ op: 'say', who: 'hero', key: 's1' }] },
        { text: 'So they sat down together and [verb:v2] happily ever after. THE END!', ops: [{ op: 'act', who: ['hero', 'monster'], key: 'v2' }, { op: 'confetti' }] },
      ],
    },
    {
      id: 'hero', title: 'Super Stick Person', blurb: 'One morning, you wake up with a very strange superpower.', place: 'city', icon: 'robot',
      setup: hero(260),
      steps: [
        { text: 'One morning, [name:name] woke up with a superpower: they could [verb:power] whenever they wanted!', ops: [{ op: 'name', who: 'hero', key: 'name' }, { op: 'act', who: 'hero', key: 'power' }] },
        { text: 'They got a cool superhero costume and dyed it [color:c1].', ops: [{ op: 'mod', who: 'hero', key: 'c1' }, { op: 'acc', who: 'hero', acc: 'sunglasses' }] },
        { text: 'But then the evil Dr. [name:villain] attacked the city with a giant robot [animal:bot]!', ops: [{ op: 'add', id: 'villain', thing: 'vampire', x: W + 60, after: 'villain' }, { op: 'walk', who: 'villain', x: 860, face: -1 }, { op: 'name', who: 'villain', key: 'villain' }, { op: 'spawn', key: 'bot', x: 620, from: 'sky', scale: 1.3 }, { op: 'status', who: 'bot', status: 'electric' }, { op: 'acc', who: 'bot', acc: 'horns' }] },
        { text: 'The robot {bot} stomped around and made everybody [verb:v1].', ops: [{ op: 'act', who: ['hero', 'villain', 'bot'], key: 'v1' }] },
        { text: 'So {name} grabbed their trusty super-[noun:gadget] and charged!', ops: [{ op: 'spawn', key: 'gadget', x: 360, scale: 0.6 }, { op: 'verb', who: 'hero', verb: 'kick', target: 'bot', after: 'gadget' }] },
        { text: 'Dr. {villain} was so [adjective:a1] that they [verb:v2] all the way to jail.', ops: [{ op: 'mod', who: 'villain', key: 'a1' }, { op: 'act', who: 'villain', key: 'v2' }] },
        { text: 'The whole city cheered "[sound:s1]!" and threw a parade for {name}. THE END!', ops: [{ op: 'burst', key: 's1' }, { op: 'confetti' }, { op: 'verb', who: 'hero', verb: 'flip' }] },
      ],
    },
  ];

  const CUSTOM_EXAMPLE = `[name:hero] found a [adjective] [noun:thing] in [place].
The {thing} started to [verb]!
{hero} yelled "[sound]!" and began to [verb].
Then a [animal] showed up, and everyone [verb] together.`;

  window.STORIES = STORIES;
  window.TYPES = TYPES;
  window.CUSTOM_EXAMPLE = CUSTOM_EXAMPLE;
})();
