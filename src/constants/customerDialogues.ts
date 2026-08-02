export interface CustomerArchetype {
  id: string;
  name: string;
  emoji: string;
  color: string;
  quotes: string[];
}

export const CUSTOMER_ARCHETYPES: Record<string, CustomerArchetype> = {
  kids: {
    id: 'kids',
    name: 'Excited Kid',
    emoji: '👦',
    color: '#FF6B6B',
    quotes: [
      "Can I get 3 scoops of Strawberry with extra sprinkles?!",
      "This is the best ice cream stand in the whole world!",
      "Double scoop Vanilla in a giant waffle cone please!",
      "Yay!! Ice cream time after school!",
      "Can I get rainbow sprinkles on top of my Lemon Sorbet?",
      "My mom said I could get two scoops today!",
      "Bubblegum flavor is my absolute favorite!",
      "Look how tall this ice cream cone is!!",
      "Can you make it extra cold and sweet?",
      "I brought my birthday money for chocolate gelato!",
      "I want the pink one with the cherry on top!",
      "Is that real Belgian chocolate?! Yummy!",
      "Can my dog get a little scoop of Vanilla too?",
      "I'm gonna eat this before it melts!",
      "Best summer day ever!! Thank you!"
    ],
  },
  executives: {
    id: 'executives',
    name: 'Business Executive',
    emoji: '💼',
    color: '#4ECDC4',
    quotes: [
      "Quick espresso & dark chocolate gelato, I have a meeting in 5 minutes!",
      "Keep the change, impressive service speed.",
      "My team needs 10 gourmet scoops for the boardroom celebration.",
      "The ROI on this Lemon Sorbet is outstanding.",
      "Hygienic, efficient, and top-tier quality.",
      "Double Dark Chocolate. Double espresso. Make it quick.",
      "I visit this stand every afternoon before market close.",
      "Premium quality dairy. Worth every cent.",
      "Can I get an itemized receipt for business expense?",
      "Your customer throughput is remarkably optimized.",
      "A quick Matcha scoop before my flight to Tokyo.",
      "Spotless counter. That's what I call management excellence.",
      "Give me your highest margin signature recipe!",
      "The tip jar is well deserved, keep up the hustle.",
      "Fast service is good business. Well done!"
    ],
  },
  influencers: {
    id: 'influencers',
    name: 'Social Media Influencer',
    emoji: '📸',
    color: '#FF8ED4',
    quotes: [
      "Wait, let me take a picture for my vlog story first!",
      "The aesthetic of this stand is 10/10! Tagging you now!",
      "Serving looks and serving scoops! #GelatoVibes",
      "Can you add extra fudge so it looks pretty on camera?",
      "My 500k followers are going to love this place!",
      "Is the lighting better on the left or right of the counter?",
      "Matching my outfit to this Mango Sorbet!",
      "Unboxing... I mean, unscooping live right now!",
      "This place is trending #1 in the city today!",
      "Gourmet toppings make the best thumbnail background!",
      "Hold the cone up while I take a slow-mo video!",
      "Obsessed with this neon shop sign!",
      "Check out this aesthetic double-scoop swirl!",
      "Reviewing the top ice cream stands in town!",
      "Instant 5-star rating for the Gram!"
    ],
  },
  critics: {
    id: 'critics',
    name: 'VIP Food Critic',
    emoji: '👨‍🍳',
    color: '#FFD166',
    quotes: [
      "Testing flavor depth and texture consistency... 9.8/10!",
      "Hygienic, crisp, and beautifully served.",
      "The overrun and air density in this gelato is perfection.",
      "Impeccable butterfat ratio in this French Vanilla.",
      "Subtle botanical notes in this Matcha. Outstanding.",
      "Clean counter, polished tubs, zero cross-contamination.",
      "A masterclass in artisanal frozen dessert craft.",
      "The temperature control on this batch is spot on.",
      "Writing a front-page review in tomorrow's food column!",
      "The waffle cone crunch pairs exquisitely with Pistachio.",
      "Balanced sugar levels and natural fruit puree.",
      "This stand sets the benchmark for street vendors globally.",
      "Exceptional customer greeting and presentation.",
      "Rarely do I encounter such authentic Italian gelato.",
      "5 Michelin Stars for this signature recipe!"
    ],
  },
  athletes: {
    id: 'athletes',
    name: 'Gym Bro & Athlete',
    emoji: '🏃',
    color: '#06D6A0',
    quotes: [
      "Is there protein in this Matcha scoop?",
      "Post-workout cheat meal! Load up the scoops!",
      "Hitting my macro targets with double Dark Chocolate!",
      "Leg day complete, now it's ice cream time!",
      "Can I get 4 scoops for maximum calorie recovery?",
      "Pure energy fuel for the marathon tomorrow!",
      "Natural fruit sorbet is the ultimate hydration!",
      "Earned every single scoop at the gym today!",
      "My trainer said one cheat scoop is allowed!",
      "High protein, high gains, high flavor!",
      "Pairing this with a 10km run tonight!",
      "Double scoop power bowl please!",
      "Smooth cream texture, pure gains!",
      "Best post-training reward in town!",
      "Fueling up for championship finals!"
    ],
  },
  gamers: {
    id: 'gamers',
    name: 'Cosplayer & Gamer',
    emoji: '🎮',
    color: '#118AB2',
    quotes: [
      "Tastes like +100 Mana restoration!",
      "Leveling up my sweet tooth right now!",
      "Achievement Unlocked: Purchased Gourmet Sundae!",
      "This ice cream stand is legendary tier loot!",
      "Equipping +50 Speed Boost from this Sugar Cone!",
      "AFK from the raid to get some gelato!",
      "Defeated the final boss, time for ice cream!",
      "Is this Strawberry scoop S-Tier on the meta list?",
      "Critical hit of flavor!! Unbelievable!",
      "Spawning in for a quick double-scoop refill!",
      "The graphics on this waffle cone look hyper-realistic!",
      "Maxing out my reputation level at this stand!",
      "Speedrunning this sundae before the timer expires!",
      "GG! Best dessert vendor on the server!",
      "Press X to claim maximum deliciousness!"
    ],
  },
  seniors: {
    id: 'seniors',
    name: 'Nostalgic Senior',
    emoji: '👵',
    color: '#8338EC',
    quotes: [
      "Reminds me of the old seaside boardwalk in 1974...",
      "Deary, your stand is so wonderfully spotless and clean!",
      "Simple Vanilla in a paper cup just like the good old days.",
      "My late husband and I used to love pistachio gelato.",
      "Such polite young workers running this stand!",
      "Ah, the sweet smell of fresh waffle cones baking!",
      "Takes me right back to summer vacations in my youth.",
      "Keep up the honest hard work, sonny!",
      "Generous scoops, just like my grandmother used to make.",
      "A sweet treat for a sunny afternoon stroll.",
      "Back in my day, ice cream cost a nickel! But this is worth it.",
      "Bless your heart, this chocolate is delicious.",
      "The secret ingredient is love, isn't it?",
      "Such a lovely little shop you've built here.",
      "I'll be bringing my grandchildren here tomorrow!"
    ],
  },
  aliens: {
    id: 'aliens',
    name: 'Cosmic Traveler',
    emoji: '🛸',
    color: '#3A86FF',
    quotes: [
      "Sub-zero dairy frozen composite detected... delicious!",
      "Transmitting recipe coordinates to Sector 7 homeworld...",
      "Earth species have mastered cryogenic sugar delights!",
      "Scanning flavor compounds... Matcha rating: Galactic 10/10!",
      "Exchanging cosmic credits for frozen Earth sphere!",
      "Temperature: 260 Kelvin. Texture: Quantum perfection.",
      "My starship crew demands 50 tubs of Belgian Chocolate!",
      "Sensory receptors overloading from Rainbow Sprinkles!",
      "Hyperspace travel makes a traveler very thirsty for sorbet!",
      "This frozen dairy matrix exceeds intergalactic standards.",
      "Beam up another double scoop immediately!",
      "Fascinating Earth custom: eating cold sweet spheres!",
      "Orbital velocity achieved via sugar rush!",
      "Requesting diplomatic immunity for extra toppings!",
      "Peace and long life... and extra fudge!"
    ],
  },
};

export function getRandomCustomerQuote(): { archetype: CustomerArchetype; quote: string } {
  const keys = Object.keys(CUSTOMER_ARCHETYPES);
  const key = keys[Math.floor(Math.random() * keys.length)] || 'kids';
  const archetype = (CUSTOMER_ARCHETYPES[key] || CUSTOMER_ARCHETYPES.kids)!;
  const quote = (archetype.quotes && archetype.quotes.length > 0) ? archetype.quotes[Math.floor(Math.random() * archetype.quotes.length)]! : 'Delicious!';
  return { archetype, quote };
}
