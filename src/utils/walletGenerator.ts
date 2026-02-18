/**
 * Pastella Wallet Generator - TypeScript Implementation
 * Based on the working PastellaUtils.js implementation
 *
 * Generates mnemonic seed, private key, public key, and address
 * using the complete Pastella algorithm with:
 * - Complete 1626-word English wordlist
 * - Real Ed25519 key generation
 * - Proper Base58 encoding
 * - Correct address generation
 */

import * as Ed25519 from '@noble/ed25519';
import { keccak256 } from 'js-sha3';

// Extend Ed25519 module to include hashes property
declare module '@noble/ed25519' {
  interface Ed25519Interface {
    hashes?: {
      sha512: (msg: Uint8Array) => Uint8Array;
    };
  }
}

// Configure SHA-512 for noble-ed25519 (only in Node.js environment)
// In browser, the library uses its own implementation
if (typeof window === 'undefined' && Ed25519.hashes) {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const nodeCrypto = require('crypto');
  Ed25519.hashes.sha512 = (msg: Uint8Array) => {
    const hash = nodeCrypto.createHash('sha512');
    hash.update(Buffer.from(msg));
    return new Uint8Array(hash.digest());
  };
  /* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
}

// ============================================================================
// TYPES
// ============================================================================

export interface WalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  mnemonic: string;
}

export interface MnemonicWalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  mnemonic: string;
  spendKey: {
    privateKey: string;
    publicKey: string;
  };
  viewKey: {
    privateKey: string;
    publicKey: string;
  };
}

// ============================================================================
// WORDLIST (1626 words from Pastella source)
// ============================================================================

const WORDLIST = [
  'abbey', 'abducts', 'ability', 'ablaze', 'abnormal', 'abort', 'abrasive', 'absorb',
  'abyss', 'academy', 'aces', 'aching', 'acidic', 'acoustic', 'acquire', 'across',
  'actress', 'acumen', 'adapt', 'addicted', 'adept', 'adhesive', 'adjust', 'adopt',
  'adrenalin', 'adult', 'adventure', 'aerial', 'afar', 'affair', 'afield', 'afloat',
  'afoot', 'afraid', 'after', 'against', 'agenda', 'aggravate', 'agile', 'aglow',
  'agnostic', 'agony', 'agreed', 'ahead', 'aided', 'ailments', 'aimless', 'airport',
  'aisle', 'ajar', 'akin', 'alarms', 'album', 'alchemy', 'alerts', 'algebra',
  'alkaline', 'alley', 'almost', 'aloof', 'alpine', 'already', 'also', 'altitude',
  'alumni', 'always', 'amaze', 'ambush', 'amended', 'amidst', 'ammo', 'amnesty',
  'among', 'amply', 'amused', 'anchor', 'android', 'anecdote', 'angled', 'ankle',
  'annoyed', 'answers', 'antics', 'anvil', 'anxiety', 'anybody', 'apart', 'apex',
  'aphid', 'aplomb', 'apology', 'apply', 'apricot', 'aptitude', 'aquarium', 'arbitrary',
  'archer', 'ardent', 'arena', 'argue', 'arises', 'army', 'around', 'arrow',
  'arsenic', 'artistic', 'ascend', 'ashtray', 'aside', 'asked', 'asleep', 'aspire',
  'assorted', 'asylum', 'athlete', 'atlas', 'atom', 'atrium', 'attire', 'auburn',
  'auctions', 'audio', 'august', 'aunt', 'austere', 'autumn', 'avatar', 'avidly',
  'avoid', 'awakened', 'awesome', 'awful', 'awkward', 'awning', 'awoken', 'axes',
  'axis', 'axle', 'aztec', 'azure', 'baby', 'bacon', 'badge', 'baffles',
  'bagpipe', 'bailed', 'bakery', 'balding', 'bamboo', 'banjo', 'baptism', 'basin',
  'batch', 'bawled', 'bays', 'because', 'beer', 'befit', 'begun', 'behind',
  'being', 'below', 'bemused', 'benches', 'berries', 'bested', 'betting', 'bevel',
  'beware', 'beyond', 'bias', 'bicycle', 'bids', 'bifocals', 'biggest', 'bikini',
  'bimonthly', 'binocular', 'biology', 'biplane', 'birth', 'biscuit', 'bite', 'biweekly',
  'blender', 'blip', 'bluntly', 'boat', 'bobsled', 'bodies', 'bogeys', 'boil',
  'boldly', 'bomb', 'border', 'boss', 'both', 'bounced', 'bovine', 'bowling',
  'boxes', 'boyfriend', 'broken', 'brunt', 'bubble', 'buckets', 'budget', 'buffet',
  'bugs', 'building', 'bulb', 'bumper', 'bunch', 'business', 'butter', 'buying',
  'buzzer', 'bygones', 'byline', 'bypass', 'cabin', 'cactus', 'cadets', 'cafe',
  'cage', 'cajun', 'cake', 'calamity', 'camp', 'candy', 'casket', 'catch',
  'cause', 'cavernous', 'cease', 'cedar', 'ceiling', 'cell', 'cement', 'cent',
  'certain', 'chlorine', 'chrome', 'cider', 'cigar', 'cinema', 'circle', 'cistern',
  'citadel', 'civilian', 'claim', 'click', 'clue', 'coal', 'cobra', 'cocoa',
  'code', 'coexist', 'coffee', 'cogs', 'cohesive', 'coils', 'colony', 'comb',
  'cool', 'copy', 'corrode', 'costume', 'cottage', 'cousin', 'cowl', 'criminal',
  'cube', 'cucumber', 'cuddled', 'cuffs', 'cuisine', 'cunning', 'cupcake', 'custom',
  'cycling', 'cylinder', 'cynical', 'dabbing', 'dads', 'daft', 'dagger', 'daily',
  'damp', 'dangerous', 'dapper', 'darted', 'dash', 'dating', 'dauntless', 'dawn',
  'daytime', 'dazed', 'debut', 'decay', 'dedicated', 'deepest', 'deftly', 'degrees',
  'dehydrate', 'deity', 'dejected', 'delayed', 'demonstrate', 'dented', 'deodorant', 'depth',
  'desk', 'devoid', 'dewdrop', 'dexterity', 'dialect', 'dice', 'diet', 'different',
  'digit', 'dilute', 'dime', 'dinner', 'diode', 'diplomat', 'directed', 'distance',
  'ditch', 'divers', 'dizzy', 'doctor', 'dodge', 'does', 'dogs', 'doing',
  'dolphin', 'domestic', 'donuts', 'doorway', 'dormant', 'dosage', 'dotted', 'double',
  'dove', 'down', 'dozen', 'dreams', 'drinks', 'drowning', 'drunk', 'drying',
  'dual', 'dubbed', 'duckling', 'dude', 'duets', 'duke', 'dullness', 'dummy',
  'dunes', 'duplex', 'duration', 'dusted', 'duties', 'dwarf', 'dwelt', 'dwindling',
  'dying', 'dynamite', 'dyslexic', 'each', 'eagle', 'earth', 'easy', 'eating',
  'eavesdrop', 'eccentric', 'echo', 'eclipse', 'economics', 'ecstatic', 'eden', 'edgy',
  'edited', 'educated', 'eels', 'efficient', 'eggs', 'egotistic', 'eight', 'either',
  'eject', 'elapse', 'elbow', 'eldest', 'eleven', 'elite', 'elope', 'else',
  'eluded', 'emails', 'ember', 'emerge', 'emit', 'emotion', 'empty', 'emulate',
  'energy', 'enforce', 'enhanced', 'enigma', 'enjoy', 'enlist', 'enmity', 'enough',
  'enraged', 'ensign', 'entrance', 'envy', 'epoxy', 'equip', 'erase', 'erected',
  'erosion', 'error', 'eskimos', 'espionage', 'essential', 'estate', 'etched', 'eternal',
  'ethics', 'etiquette', 'evaluate', 'evenings', 'evicted', 'evolved', 'examine', 'excess',
  'exhale', 'exit', 'exotic', 'exquisite', 'extra', 'exult', 'fabrics', 'factual',
  'fading', 'fainted', 'faked', 'fall', 'family', 'fancy', 'farming', 'fatal',
  'faulty', 'fawns', 'faxed', 'fazed', 'feast', 'february', 'federal', 'feel',
  'feline', 'females', 'fences', 'ferry', 'festival', 'fetches', 'fever', 'fewest',
  'fiat', 'fibula', 'fictional', 'fidget', 'fierce', 'fifteen', 'fight', 'films',
  'firm', 'fishing', 'fitting', 'five', 'fixate', 'fizzle', 'fleet', 'flippant',
  'flying', 'foamy', 'focus', 'foes', 'foggy', 'foiled', 'folding', 'fonts',
  'foolish', 'fossil', 'fountain', 'fowls', 'foxes', 'foyer', 'framed', 'friendly',
  'frown', 'fruit', 'frying', 'fudge', 'fuel', 'fugitive', 'fully', 'fuming',
  'fungal', 'furnished', 'fuselage', 'future', 'fuzzy', 'gables', 'gadget', 'gags',
  'gained', 'galaxy', 'gambit', 'gang', 'gasp', 'gather', 'gauze', 'gave',
  'gawk', 'gaze', 'gearbox', 'gecko', 'geek', 'gels', 'gemstone', 'general',
  'geometry', 'germs', 'gesture', 'getting', 'geyser', 'ghetto', 'ghost', 'giant',
  'giddy', 'gifts', 'gigantic', 'gills', 'gimmick', 'ginger', 'girth', 'giving',
  'glass', 'gleeful', 'glide', 'gnaw', 'gnome', 'goat', 'goblet', 'godfather',
  'goes', 'goggles', 'going', 'goldfish', 'gone', 'goodbye', 'gopher', 'gorilla',
  'gossip', 'gotten', 'gourmet', 'governing', 'gown', 'greater', 'grunt', 'guarded',
  'guest', 'guide', 'gulp', 'gumball', 'guru', 'gusts', 'gutter', 'guys',
  'gymnast', 'gypsy', 'gyrate', 'habitat', 'hacksaw', 'haggled', 'hairy', 'hamburger',
  'happens', 'hashing', 'hatchet', 'haunted', 'having', 'hawk', 'haystack', 'hazard',
  'hectare', 'hedgehog', 'heels', 'hefty', 'height', 'hemlock', 'hence', 'heron',
  'hesitate', 'hexagon', 'hickory', 'hiding', 'highway', 'hijack', 'hiker', 'hills',
  'himself', 'hinder', 'hippo', 'hire', 'history', 'hitched', 'hive', 'hoax',
  'hobby', 'hockey', 'hoisting', 'hold', 'honked', 'hookup', 'hope', 'hornet',
  'hospital', 'hotel', 'hounded', 'hover', 'howls', 'hubcaps', 'huddle', 'huge',
  'hull', 'humid', 'hunter', 'hurried', 'husband', 'huts', 'hybrid', 'hydrogen',
  'hyper', 'iceberg', 'icing', 'icon', 'identity', 'idiom', 'idled', 'idols',
  'igloo', 'ignore', 'iguana', 'illness', 'imagine', 'imbalance', 'imitate', 'impel',
  'inactive', 'inbound', 'incur', 'industrial', 'inexact', 'inflamed', 'ingested', 'initiate',
  'injury', 'inkling', 'inline', 'inmate', 'innocent', 'inorganic', 'input', 'inquest',
  'inroads', 'insult', 'intended', 'inundate', 'invoke', 'inwardly', 'ionic', 'irate',
  'iris', 'irony', 'irritate', 'island', 'isolated', 'issued', 'italics', 'itches',
  'items', 'itinerary', 'itself', 'ivory', 'jabbed', 'jackets', 'jaded', 'jagged',
  'jailed', 'jamming', 'january', 'jargon', 'jaunt', 'javelin', 'jaws', 'jazz',
  'jeans', 'jeers', 'jellyfish', 'jeopardy', 'jerseys', 'jester', 'jetting', 'jewels',
  'jigsaw', 'jingle', 'jittery', 'jive', 'jobs', 'jockey', 'jogger', 'joining',
  'joking', 'jolted', 'jostle', 'journal', 'joyous', 'jubilee', 'judge', 'juggled',
  'juicy', 'jukebox', 'july', 'jump', 'junk', 'jury', 'justice', 'juvenile',
  'kangaroo', 'karate', 'keep', 'kennel', 'kept', 'kernels', 'kettle', 'keyboard',
  'kickoff', 'kidneys', 'king', 'kiosk', 'kisses', 'kitchens', 'kiwi', 'knapsack',
  'knee', 'knife', 'knowledge', 'knuckle', 'koala', 'laboratory', 'ladder', 'lagoon',
  'lair', 'lakes', 'lamb', 'language', 'laptop', 'large', 'last', 'later',
  'launching', 'lava', 'lawsuit', 'layout', 'lazy', 'lectures', 'ledge', 'leech',
  'left', 'legion', 'leisure', 'lemon', 'lending', 'leopard', 'lesson', 'lettuce',
  'lexicon', 'liar', 'library', 'licks', 'lids', 'lied', 'lifestyle', 'light',
  'likewise', 'lilac', 'limits', 'linen', 'lion', 'lipstick', 'liquid', 'listen',
  'lively', 'loaded', 'lobster', 'locker', 'lodge', 'lofty', 'logic', 'loincloth',
  'long', 'looking', 'lopped', 'lordship', 'losing', 'lottery', 'loudly', 'love',
  'lower', 'loyal', 'lucky', 'luggage', 'lukewarm', 'lullaby', 'lumber', 'lunar',
  'lurk', 'lush', 'luxury', 'lymph', 'lynx', 'lyrics', 'macro', 'madness',
  'magically', 'mailed', 'major', 'makeup', 'malady', 'mammal', 'maps', 'masterful',
  'match', 'maul', 'maverick', 'maximum', 'mayor', 'maze', 'meant', 'mechanic',
  'medicate', 'meeting', 'megabyte', 'melting', 'memoir', 'menu', 'merger', 'mesh',
  'metro', 'mews', 'mice', 'midst', 'mighty', 'mime', 'mirror', 'misery',
  'mittens', 'mixture', 'moat', 'mobile', 'mocked', 'mohawk', 'moisture', 'molten',
  'moment', 'money', 'moon', 'mops', 'morsel', 'mostly', 'motherly', 'mouth',
  'movement', 'mowing', 'much', 'muddy', 'muffin', 'mugged', 'mullet', 'mumble',
  'mundane', 'muppet', 'mural', 'musical', 'muzzle', 'myriad', 'mystery', 'myth',
  'nabbing', 'nagged', 'nail', 'names', 'nanny', 'napkin', 'narrate', 'nasty',
  'natural', 'nautical', 'navy', 'nearby', 'necklace', 'needed', 'negative', 'neither',
  'neon', 'nephew', 'nerves', 'nestle', 'network', 'neutral', 'never', 'newt',
  'nexus', 'nibs', 'niche', 'niece', 'nifty', 'nightly', 'nimbly', 'nineteen',
  'nirvana', 'nitrogen', 'nobody', 'nocturnal', 'nodes', 'noises', 'nomad', 'noodles',
  'northern', 'nostril', 'noted', 'nouns', 'novelty', 'nowhere', 'nozzle', 'nuance',
  'nucleus', 'nudged', 'nugget', 'nuisance', 'null', 'number', 'nuns', 'nurse',
  'nutshell', 'nylon', 'oaks', 'oars', 'oasis', 'oatmeal', 'obedient', 'object',
  'obliged', 'obnoxious', 'observant', 'obtains', 'obvious', 'occur', 'ocean', 'october',
  'odds', 'odometer', 'offend', 'often', 'oilfield', 'ointment', 'okay', 'older',
  'olive', 'olympics', 'omega', 'omission', 'omnibus', 'onboard', 'oncoming', 'oneself',
  'ongoing', 'onion', 'online', 'onslaught', 'onto', 'onward', 'oozed', 'opacity',
  'opened', 'opposite', 'optical', 'opus', 'orange', 'orbit', 'orchid', 'orders',
  'organs', 'origin', 'ornament', 'orphans', 'oscar', 'ostrich', 'otherwise', 'otter',
  'ouch', 'ought', 'ounce', 'ourselves', 'oust', 'outbreak', 'oval', 'oven',
  'owed', 'owls', 'owner', 'oxidant', 'oxygen', 'oyster', 'ozone', 'pact',
  'paddles', 'pager', 'pairing', 'palace', 'pamphlet', 'pancakes', 'paper', 'paradise',
  'pastry', 'patio', 'pause', 'pavements', 'pawnshop', 'payment', 'peaches', 'pebbles',
  'peculiar', 'pedantic', 'peeled', 'pegs', 'pelican', 'pencil', 'people', 'pepper',
  'perfect', 'pests', 'petals', 'phase', 'pheasants', 'phone', 'phrases', 'physics',
  'piano', 'picked', 'pierce', 'pigment', 'piloted', 'pimple', 'pinched', 'pioneer',
  'pipeline', 'pirate', 'pistons', 'pitched', 'pivot', 'pixels', 'pizza', 'playful',
  'pledge', 'pliers', 'plotting', 'plus', 'plywood', 'poaching', 'pockets', 'podcast',
  'poetry', 'point', 'poker', 'polar', 'ponies', 'pool', 'popular', 'portents',
  'possible', 'potato', 'pouch', 'poverty', 'powder', 'pram', 'present', 'pride',
  'problems', 'pruned', 'prying', 'psychic', 'public', 'puck', 'puddle', 'puffin',
  'pulp', 'pumpkins', 'punch', 'puppy', 'purged', 'push', 'putty', 'puzzled',
  'pylons', 'pyramid', 'python', 'queen', 'quick', 'quote', 'rabbits', 'racetrack',
  'radar', 'rafts', 'rage', 'railway', 'raking', 'rally', 'ramped', 'randomly',
  'rapid', 'rarest', 'rash', 'rated', 'ravine', 'rays', 'razor', 'react',
  'rebel', 'recipe', 'reduce', 'reef', 'refer', 'regular', 'reheat', 'reinvest',
  'rejoices', 'rekindle', 'relic', 'remedy', 'renting', 'reorder', 'repent', 'request',
  'reruns', 'rest', 'return', 'reunion', 'revamp', 'rewind', 'rhino', 'rhythm',
  'ribbon', 'richly', 'ridges', 'rift', 'rigid', 'rims', 'ringing', 'riots',
  'ripped', 'rising', 'ritual', 'river', 'roared', 'robot', 'rockets', 'rodent',
  'rogue', 'roles', 'romance', 'roomy', 'roped', 'roster', 'rotate', 'rounded',
  'rover', 'rowboat', 'royal', 'ruby', 'rudely', 'ruffled', 'rugged', 'ruined',
  'ruling', 'rumble', 'runway', 'rural', 'rustled', 'ruthless', 'sabotage', 'sack',
  'sadness', 'safety', 'saga', 'sailor', 'sake', 'salads', 'sample', 'sanity',
  'sapling', 'sarcasm', 'sash', 'satin', 'saucepan', 'saved', 'sawmill', 'saxophone',
  'sayings', 'scamper', 'scenic', 'school', 'science', 'scoop', 'scrub', 'scuba',
  'seasons', 'second', 'sedan', 'seeded', 'segments', 'seismic', 'selfish', 'semifinal',
  'sensible', 'september', 'sequence', 'serving', 'session', 'setup', 'seventh', 'sewage',
  'shackles', 'shelter', 'shipped', 'shocking', 'shrugged', 'shuffled', 'shyness', 'siblings',
  'sickness', 'sidekick', 'sieve', 'sifting', 'sighting', 'silk', 'simplest', 'sincerely',
  'sipped', 'siren', 'situated', 'sixteen', 'sizes', 'skater', 'skew', 'skirting',
  'skulls', 'skydive', 'slackens', 'sleepless', 'slid', 'slower', 'slug', 'smash',
  'smelting', 'smidgen', 'smog', 'smuggled', 'snake', 'sneeze', 'sniff', 'snout',
  'snug', 'soapy', 'sober', 'soccer', 'soda', 'software', 'soggy', 'soil',
  'solved', 'somewhere', 'sonic', 'soothe', 'soprano', 'sorry', 'southern', 'sovereign',
  'sowed', 'soya', 'space', 'speedy', 'sphere', 'spiders', 'splendid', 'spout',
  'sprig', 'spud', 'spying', 'square', 'stacking', 'stellar', 'stick', 'stockpile',
  'strained', 'stunning', 'stylishly', 'subtly', 'succeed', 'suddenly', 'suede', 'suffice',
  'sugar', 'suitcase', 'sulking', 'summon', 'sunken', 'superior', 'surfer', 'sushi',
  'suture', 'swagger', 'swept', 'swiftly', 'sword', 'swung', 'syllabus', 'symptoms',
  'syndrome', 'syringe', 'system', 'taboo', 'tacit', 'tadpoles', 'tagged', 'tail',
  'taken', 'talent', 'tamper', 'tanks', 'tapestry', 'tarnished', 'tasked', 'tattoo',
  'taunts', 'tavern', 'tawny', 'taxi', 'teardrop', 'technical', 'tedious', 'teeming',
  'tell', 'template', 'tender', 'tepid', 'tequila', 'terminal', 'testing', 'tether',
  'textbook', 'thaw', 'theatrics', 'thirsty', 'thorn', 'threaten', 'thumbs', 'thwart',
  'ticket', 'tidy', 'tiers', 'tiger', 'tilt', 'timber', 'tinted', 'tipsy',
  'tirade', 'tissue', 'titans', 'toaster', 'tobacco', 'today', 'toenail', 'toffee',
  'together', 'toilet', 'token', 'tolerant', 'tomorrow', 'tonic', 'toolbox', 'topic',
  'torch', 'tossed', 'total', 'touchy', 'towel', 'toxic', 'toyed', 'trash',
  'trendy', 'tribal', 'trolling', 'truth', 'trying', 'tsunami', 'tubes', 'tucks',
  'tudor', 'tuesday', 'tufts', 'tugs', 'tuition', 'tulips', 'tumbling', 'tunnel',
  'turnip', 'tusks', 'tutor', 'tuxedo', 'twang', 'tweezers', 'twice', 'twofold',
  'tycoon', 'typist', 'tyrant', 'ugly', 'ulcers', 'ultimate', 'umbrella', 'umpire',
  'unafraid', 'unbending', 'uncle', 'under', 'uneven', 'unfit', 'ungainly', 'unhappy',
  'union', 'unjustly', 'unknown', 'unlikely', 'unmask', 'unnoticed', 'unopened', 'unplugs',
  'unquoted', 'unrest', 'unsafe', 'until', 'unusual', 'unveil', 'unwind', 'unzip',
  'upbeat', 'upcoming', 'update', 'upgrade', 'uphill', 'upkeep', 'upload', 'upon',
  'upper', 'upright', 'upstairs', 'uptight', 'upwards', 'urban', 'urchins', 'urgent',
  'usage', 'useful', 'usher', 'using', 'usual', 'utensils', 'utility', 'utmost',
  'utopia', 'uttered', 'vacation', 'vague', 'vain', 'value', 'vampire', 'vane',
  'vapidly', 'vary', 'vastness', 'vats', 'vaults', 'vector', 'veered', 'vegan',
  'vehicle', 'vein', 'velvet', 'venomous', 'verification', 'vessel', 'veteran', 'vexed',
  'vials', 'vibrate', 'victim', 'video', 'viewpoint', 'vigilant', 'viking', 'village',
  'vinegar', 'violin', 'vipers', 'virtual', 'visited', 'vitals', 'vivid', 'vixen',
  'vocal', 'vogue', 'voice', 'volcano', 'vortex', 'voted', 'voucher', 'vowels',
  'voyage', 'vulture', 'wade', 'waffle', 'wagtail', 'waist', 'waking', 'wallets',
  'wanted', 'warped', 'washing', 'water', 'waveform', 'waxing', 'wayside', 'weavers',
  'website', 'wedge', 'weekday', 'weird', 'welders', 'went', 'wept', 'were',
  'western', 'wetsuit', 'whale', 'when', 'whipped', 'whole', 'wickets', 'width',
  'wield', 'wife', 'wiggle', 'wildly', 'winter', 'wipeout', 'wiring', 'wise',
  'withdrawn', 'wives', 'wizard', 'wobbly', 'woes', 'woken', 'wolf', 'womanly',
  'wonders', 'woozy', 'worry', 'wounded', 'woven', 'wrap', 'wrist', 'wrong',
  'yacht', 'yahoo', 'yanks', 'yard', 'yawning', 'yearbook', 'yellow', 'yesterday',
  'yeti', 'yields', 'yodel', 'yoga', 'younger', 'yoyo', 'zapped', 'zeal',
  'zebra', 'zero', 'zesty', 'zigzags', 'zinger', 'zippers', 'zodiac', 'zombie',
  'zones', 'zoom',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert byte array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * CRC32 implementation
 */
function crc32(str: string): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Get word index in wordlist
 */
function getWordIndex(word: string): number {
  const index = WORDLIST.indexOf(word);
  if (index === -1) {
    throw new Error(`Word not found in wordlist: ${word}`);
  }
  return index;
}

// ============================================================================
// MNEMONIC FUNCTIONS
// ============================================================================

/**
 * Convert mnemonic seed to private key (32 bytes)
 * Algorithm from Pastella Mnemonics.cpp
 */
function mnemonicToPrivateKey(mnemonic: string): Uint8Array {
  const words = mnemonic.trim().split(/\s+/);
  if (words.length !== 25) {
    throw new Error('Mnemonic must have exactly 25 words');
  }

  // Use only first 24 words (25th is checksum)
  const dataWords = words.slice(0, 24);
  const privateKeyBytes: number[] = [];

  // Process 3 words at a time (8 iterations)
  for (let i = 0; i < 24; i += 3) {
    const w1 = getWordIndex(dataWords[i]);
    const w2 = getWordIndex(dataWords[i + 1]);
    const w3 = getWordIndex(dataWords[i + 2]);
    const wlLen = 1626;

    // Encode formula from Mnemonics.cpp
    const val = w1 + wlLen * (((wlLen - w1) + w2) % wlLen) +
                wlLen * wlLen * (((wlLen - w2) + w3) % wlLen);

    // Verify encoding is reversible
    if (val % wlLen !== w1) {
      throw new Error('Invalid mnemonic encoding');
    }

    // Convert to 4 bytes (little-endian)
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, val, true); // true = little-endian

    // Append bytes to private key
    for (let j = 0; j < 4; j++) {
      privateKeyBytes.push(view.getUint8(j));
    }
  }

  return new Uint8Array(privateKeyBytes);
}

/**
 * Calculate checksum word from 24 words
 */
function calculateChecksumWord(words: string[]): string {
  // Take first 3 letters from each word
  let trimmed = '';
  for (const word of words) {
    trimmed += word.substr(0, 3);
  }

  // Calculate CRC32
  const hash = crc32(trimmed);

  // Get checksum word index
  const checksumIndex = hash % 24;

  return words[checksumIndex];
}

/**
 * Generate mnemonic from private key
 */
function privateKeyToMnemonic(privateKeyBytes: Uint8Array): string {
  const words: string[] = [];
  const wlLen = 1626;

  // Process private key 4 bytes at a time (8 iterations)
  for (let i = 0; i < 32; i += 4) {
    // Read 4 bytes as little-endian uint32
    const view = new DataView(privateKeyBytes.buffer, i, 4);
    const val = view.getUint32(0, true); // true = little-endian

    // Decode formula (reverse of encoding)
    const w1 = val % wlLen;
    const w2 = ((Math.floor(val / wlLen) + w1) % wlLen);
    const w3 = ((Math.floor(Math.floor(val / wlLen) / wlLen) + w2) % wlLen);

    // Add words
    words.push(WORDLIST[w1]);
    words.push(WORDLIST[w2]);
    words.push(WORDLIST[w3]);
  }

  // Calculate checksum word
  const checksumWord = calculateChecksumWord(words);
  words.push(checksumWord);

  return words.join(' ');
}

/**
 * Verify mnemonic checksum
 */
function verifyMnemonicChecksum(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  if (words.length !== 25) {
    return false;
  }

  const dataWords = words.slice(0, 24);
  const expectedChecksum = calculateChecksumWord(dataWords);
  const actualChecksum = words[24];

  return expectedChecksum === actualChecksum;
}

// ============================================================================
// ENCODING FUNCTIONS
// ============================================================================

/**
 * Encode integer as varint (CryptoNote standard)
 */
function encodeVarint(num: number): Uint8Array {
  const bytes: number[] = [];

  while (num >= 0x80) {
    const byte = (num & 0x7f) | 0x80;
    bytes.push(byte);
    num >>>= 7;  // Use unsigned right shift
  }
  bytes.push(num & 0xff);

  return new Uint8Array(bytes);
}

/**
 * Block-based Base58 encoding (matches C++ CryptoNote implementation)
 */
function base58Encode(buffer: Uint8Array): string {
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  // Block sizes from C++
  const ENCODED_BLOCK_SIZES = [0, 2, 3, 5, 6, 7, 9, 10, 11];
  const FULL_BLOCK_SIZE = 8;
  const FULL_ENCODED_BLOCK_SIZE = 11;

  if (buffer.length === 0) {
    return '';
  }

  const fullBlockCount = Math.floor(buffer.length / FULL_BLOCK_SIZE);
  const lastBlockSize = buffer.length % FULL_BLOCK_SIZE;

  // Calculate result size
  const resultSize = fullBlockCount * FULL_ENCODED_BLOCK_SIZE + ENCODED_BLOCK_SIZES[lastBlockSize];
  const result = new Array(resultSize).fill(BASE58_ALPHABET[0]);

  // Encode full blocks
  for (let i = 0; i < fullBlockCount; i++) {
    const blockStart = i * FULL_BLOCK_SIZE;
    const resultStart = i * FULL_ENCODED_BLOCK_SIZE;

    // Extract 8-byte block and convert to big-endian BigInt
    let num = uint8BeToBigInt(buffer, blockStart, FULL_BLOCK_SIZE);

    // Encode to Base58
    let j = ENCODED_BLOCK_SIZES[FULL_BLOCK_SIZE] - 1;
    while (num > 0n) {
      const remainder = num % 58n;
      num = num / 58n;
      result[resultStart + j] = BASE58_ALPHABET[Number(remainder)];
      j--;
    }
  }

  // Encode last block (if any)
  if (lastBlockSize > 0) {
    const blockStart = fullBlockCount * FULL_BLOCK_SIZE;
    const resultStart = fullBlockCount * FULL_ENCODED_BLOCK_SIZE;

    // Extract partial block and convert to big-endian BigInt
    let num = uint8BeToBigInt(buffer, blockStart, lastBlockSize);

    // Encode to Base58
    let j = ENCODED_BLOCK_SIZES[lastBlockSize] - 1;
    while (num > 0n) {
      const remainder = num % 58n;
      num = num / 58n;
      result[resultStart + j] = BASE58_ALPHABET[Number(remainder)];
      j--;
    }
  }

  return result.join('');
}

/**
 * Convert uint8 array to BigInt (big-endian)
 */
function uint8BeToBigInt(buffer: Uint8Array, offset: number, size: number): bigint {
  if (size < 1 || size > 8) {
    throw new Error('Invalid size');
  }

  let num = 0n;
  for (let i = 0; i < size; i++) {
    num = num << 8n;
    num = num | BigInt(buffer[offset + i]);
  }

  return num;
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate Ed25519 keypair from private key
 *
 * CRITICAL: This uses raw scalar multiplication like Pastella does!
 * Based on analysis of crypto.cpp:secret_key_to_public_key
 * - For imported keys: mnemonic gives 32 bytes directly (assume valid)
 * - For generated keys: must ensure scalar < curve order
 * - NO clamping applied (ge_scalarmult_base doesn't clamp)
 * - Direct scalar multiplication without hashing
 */
function generateEd25519Keypair(privateKeyBytes: Uint8Array, ensureValid = true): { publicKey: Uint8Array; privateKey: Uint8Array } {
  // Step 1: Convert little-endian bytes to BigInt (no clamping!)
  let scalarBigInt = 0n;
  for (let i = 0; i < 32; i++) {
    scalarBigInt |= BigInt(privateKeyBytes[i]) << (BigInt(i) * 8n);
  }

  // Step 2: Ensure scalar is valid (less than curve order)
  // The curve order l = 2^252 + 27742317777372353535851937790883648493
  const curveOrder = 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;
  let scalarToUse = scalarBigInt;

  if (ensureValid && scalarBigInt >= curveOrder) {
    // Reduce modulo curve order
    scalarToUse = scalarBigInt % curveOrder;
  }

  // Step 3: Raw scalar multiplication (no hashing, no clamping!)
  // This matches Pastella's ge_scalarmult_base behavior
  const point = Ed25519.Point.BASE.multiply(scalarToUse);
  const publicKeyBytes = point.toBytes();

  return {
    publicKey: new Uint8Array(publicKeyBytes),
    privateKey: new Uint8Array(privateKeyBytes)
  };
}

// ============================================================================
// ADDRESS GENERATION
// ============================================================================

/**
 * Generate address from public key
 * Algorithm from Pastella Addresses.cpp
 */
function publicKeyToAddress(publicKeyBytes: Uint8Array): string {
  // Prefix: 0x198004 (CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX)
  const PREFIX = 0x198004;

  // Encode prefix as varint
  const prefixBytes = encodeVarint(PREFIX);

  // Create buffer: varint(prefix) + publicKey
  const buffer = new Uint8Array(prefixBytes.length + publicKeyBytes.length);
  buffer.set(prefixBytes, 0);
  buffer.set(publicKeyBytes, prefixBytes.length);

  // Calculate Keccak-256 hash (cn_fast_hash in C++)
  const hashHex = keccak256(buffer);
  const hashBytes = hexToBytes(hashHex);

  // Take first 4 bytes as checksum
  const checksum = hashBytes.slice(0, 4);

  // Create final buffer: varint(prefix) + publicKey + checksum
  const finalBuffer = new Uint8Array(buffer.length + 4);
  finalBuffer.set(buffer, 0);
  finalBuffer.set(checksum, buffer.length);

  // Base58 encode using block-based encoding
  return base58Encode(finalBuffer);
}

// ============================================================================
// WALLET GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate cryptographically secure random bytes (Browser-compatible)
 */
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  // Use Web Crypto API for browser environments
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return array;
  }

  // Fallback to Node.js crypto module for server-side rendering
  if (typeof window === 'undefined') {
    /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
    const nodeCrypto = require('crypto');
    return new Uint8Array(nodeCrypto.randomBytes(length));
    /* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  }

  throw new Error('No secure random number generator available');
}

/**
 * Generate complete wallet
 */
export async function generateWallet(): Promise<WalletData> {
  const curveOrder = 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;

  // Keep generating until we get a valid scalar (< curve order)
  let privateKeyBytes: Uint8Array;
  let scalarBigInt: bigint;
  let attempts = 0;

  do {
    // Generate 32 random bytes
    privateKeyBytes = await generateRandomBytes(32);

    // Convert to BigInt
    scalarBigInt = 0n;
    for (let i = 0; i < 32; i++) {
      scalarBigInt |= BigInt(privateKeyBytes[i]) << (BigInt(i) * 8n);
    }

    attempts++;
  } while (scalarBigInt >= curveOrder && attempts < 1000);

  if (attempts >= 1000) {
    throw new Error('Failed to generate valid scalar after 1000 attempts');
  }

  // Generate mnemonic from the valid private key
  const mnemonic = privateKeyToMnemonic(privateKeyBytes);

  // Generate keypair (will not reduce since scalar is already valid)
  const keypair = generateEd25519Keypair(privateKeyBytes);

  // Generate address
  const address = publicKeyToAddress(keypair.publicKey);

  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: bytesToHex(keypair.publicKey),
    address: address,
    mnemonic: mnemonic
  };
}

/**
 * Generate wallet (simplified version)
 */
export async function generateWalletSimple(): Promise<WalletData> {
  return generateWallet();
}

/**
 * Import wallet from mnemonic
 */
export function importFromMnemonic(mnemonic: string): WalletData {
  // Verify checksum
  if (!verifyMnemonicChecksum(mnemonic)) {
    throw new Error('Invalid mnemonic checksum');
  }

  // Convert mnemonic to private key
  const privateKeyBytes = mnemonicToPrivateKey(mnemonic);

  // Generate keypair (don't validate - assume mnemonic gives valid key)
  const keypair = generateEd25519Keypair(privateKeyBytes, false);

  // Generate address
  const address = publicKeyToAddress(keypair.publicKey);

  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: bytesToHex(keypair.publicKey),
    address: address,
    mnemonic: mnemonic
  };
}

/**
 * Import wallet from private key
 */
export function importFromPrivateKey(privateKeyHex: string): WalletData {
  const privateKeyBytes = hexToBytes(privateKeyHex);

  // Generate keypair
  const keypair = generateEd25519Keypair(privateKeyBytes, false);

  // Generate address
  const address = publicKeyToAddress(keypair.publicKey);

  // Generate mnemonic
  const mnemonic = privateKeyToMnemonic(privateKeyBytes);

  return {
    privateKey: privateKeyHex,
    publicKey: bytesToHex(keypair.publicKey),
    address: address,
    mnemonic: mnemonic
  };
}

/**
 * Verify mnemonic checksum
 */
export { verifyMnemonicChecksum };

/**
 * Get wordlist
 */
export function getWordlist(): string[] {
  return [...WORDLIST];
}
