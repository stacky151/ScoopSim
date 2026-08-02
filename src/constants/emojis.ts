
export interface EmojiEntry {
  fallback: string;
  name:     string;
  prompt:   string;
}

export const EMOJI_DEFINITIONS: Record<string, EmojiEntry> = {
  cross_red:     { fallback: '❌', name: 'sc_cross_red',     prompt: 'A 16-bit retro pixel art game icon of a red X cross symbol, transparent background' },
  cash:          { fallback: '💵', name: 'sc_cash',          prompt: 'A 16-bit retro pixel art game icon of a stack of green dollar bills, transparent background' },
  broom:         { fallback: '🧹', name: 'sc_broom',         prompt: 'A 16-bit retro pixel art game icon of a wooden broom sweeping dust, transparent background' },
  check_green:   { fallback: '✅', name: 'sc_check_green',   prompt: 'A 16-bit retro pixel art game icon of a green checkmark check symbol, transparent background' },
  dot_green:     { fallback: '🟢', name: 'sc_dot_green',     prompt: 'A 16-bit retro pixel art game icon of a glowing green sphere orb, transparent background' },
  gear:          { fallback: '⚙️', name: 'sc_gear',          prompt: 'A 16-bit retro pixel art game icon of a metallic iron gear cog, transparent background' },
  star:          { fallback: '⭐', name: 'sc_star',          prompt: 'A 16-bit retro pixel art game icon of a glowing five-pointed golden star, transparent background' },
  warning:       { fallback: '⚠️', name: 'sc_warning',       prompt: 'A 16-bit retro pixel art game icon of a yellow warning triangle sign, transparent background' },
  wallet:        { fallback: '💼', name: 'sc_wallet',        prompt: 'A 16-bit retro pixel art game icon of a brown leather wallet bulging with cash, transparent background' },
  tie:           { fallback: '👔', name: 'sc_tie',           prompt: 'A 16-bit retro pixel art game icon of a formal purple silk business tie, transparent background' },
  scoop:         { fallback: '🍨', name: 'sc_scoop',         prompt: 'A 16-bit retro pixel art game icon of a pink strawberry ice cream scoop in a bowl, transparent background' },
  box:           { fallback: '📦', name: 'sc_box',           prompt: 'A 16-bit retro pixel art game icon of a brown cardboard shipping box, transparent background' },
  globe:         { fallback: '🌍', name: 'sc_globe',         prompt: 'A 16-bit retro pixel art game icon of a green and blue pixel world globe map, transparent background' },
  stop:          { fallback: '🛑', name: 'sc_stop',          prompt: 'A 16-bit retro pixel art game icon of a red octagonal stop sign, transparent background' },
  lock:          { fallback: '🔒', name: 'sc_lock',          prompt: 'A 16-bit retro pixel art game icon of a golden padlock lock, transparent background' },
  store:         { fallback: '🏪', name: 'sc_store',         prompt: 'A 16-bit retro pixel art game icon of a retro ice cream shop store facade, transparent background' },
  dot_red:       { fallback: '🔴', name: 'sc_dot_red',       prompt: 'A 16-bit retro pixel art game icon of a glowing red sphere orb, transparent background' },
  workers:       { fallback: '👥', name: 'sc_workers',       prompt: 'A 16-bit retro pixel art game icon of two pixel art service workers, transparent background' },
  gem:           { fallback: '💎', name: 'sc_gem',           prompt: 'A 16-bit retro pixel art game icon of a sparkling cyan diamond gemstone, transparent background' },
  arrow_back:    { fallback: '🔙', name: 'sc_arrow_back',    prompt: 'A 16-bit retro pixel art game icon of a bold left-pointing return arrow, transparent background' },
  cone:          { fallback: '📐', name: 'sc_cone',          prompt: 'A 16-bit retro pixel art game icon of a waffle ice cream cone, transparent background' },
  money_bag:     { fallback: '💰', name: 'sc_money_bag',     prompt: 'A 16-bit retro pixel art game icon of a canvas bag tied with string, marked with dollar symbol, transparent background' },
  gift:          { fallback: '🎁', name: 'sc_gift',          prompt: 'A 16-bit retro pixel art game icon of a red wrapped gift box with a yellow ribbon bow, transparent background' },
  pencil:        { fallback: '✏️', name: 'sc_pencil',        prompt: 'A 16-bit retro pixel art game icon of a yellow pencil writing, transparent background' },
  refresh:       { fallback: '🔄', name: 'sc_refresh',       prompt: 'A 16-bit retro pixel art game icon of two looping circular refresh arrows, transparent background' },
  door:          { fallback: '🚪', name: 'sc_door',          prompt: 'A 16-bit retro pixel art game icon of an open wooden door with bright light shining through, transparent background' },
  cloudy_sun:    { fallback: '⛅', name: 'sc_cloudy_sun',    prompt: 'A 16-bit retro pixel art game icon of a yellow sun partially hidden by a white cloud, transparent background' },
  sparkles:      { fallback: '✨', name: 'sc_sparkles',      prompt: 'A 16-bit retro pixel art game icon of yellow sparkling star glints, transparent background' },
  trophy:        { fallback: '🏆', name: 'sc_trophy',        prompt: 'A 16-bit retro pixel art game icon of a shining golden champion trophy cup, transparent background' },
  medal_gold:    { fallback: '🥇', name: 'sc_medal_gold',    prompt: 'A 16-bit retro pixel art game icon of a gold winner medal with a red ribbon, transparent background' },
  medal_silver:  { fallback: '🥈', name: 'sc_medal_silver',  prompt: 'A 16-bit retro pixel art game icon of a silver winner medal with a blue ribbon, transparent background' },
  medal_bronze:  { fallback: '🥉', name: 'sc_medal_bronze',  prompt: 'A 16-bit retro pixel art game icon of a bronze winner medal with a green ribbon, transparent background' },
  clipboard:     { fallback: '📋', name: 'sc_clipboard',     prompt: 'A 16-bit retro pixel art game icon of a clipboard with a checklist paper, transparent background' },
  popper:        { fallback: '🎉', name: 'sc_popper',        prompt: 'A 16-bit retro pixel art game icon of a party popper exploding with confetti, transparent background' },
  chocolate:     { fallback: '🍫', name: 'sc_chocolate',     prompt: 'A 16-bit retro pixel art game icon of a brown chocolate bar wrapped in foil, transparent background' },
  strawberry:    { fallback: '🍓', name: 'sc_strawberry',    prompt: 'A 16-bit retro pixel art game icon of a ripe red strawberry, transparent background' },
  mint:          { fallback: '🌿', name: 'sc_mint',          prompt: 'A 16-bit retro pixel art game icon of fresh green mint leaves, transparent background' },
  pistachio:     { fallback: '🥜', name: 'sc_pistachio',     prompt: 'A 16-bit retro pixel art game icon of cracked pistachio nuts, transparent background' },
  cup:           { fallback: '🥣', name: 'sc_cup',           prompt: 'A 16-bit retro pixel art game icon of a white paper ice cream cup bowl, transparent background' },
  freezer:       { fallback: '❄️', name: 'sc_freezer',       prompt: 'A 16-bit retro pixel art game icon of a white compact kitchen freezer chest, transparent background' },
  rack:          { fallback: '🪵', name: 'sc_rack',          prompt: 'A 16-bit retro pixel art game icon of a wooden display rack for holding cones, transparent background' },
  neon_sign:     { fallback: '🚨', name: 'sc_neon_sign',     prompt: 'A 16-bit retro pixel art game icon of a glowing red neon OPEN sign, transparent background' },
  counter:       { fallback: '🪟', name: 'sc_counter',       prompt: 'A 16-bit retro pixel art game icon of a luxury white marble shop counter, transparent background' },
  critic:        { fallback: '🍳', name: 'sc_critic',        prompt: 'A 16-bit retro pixel art game icon of a gold chef hat and crossed fork, transparent background' },
  star_movie:    { fallback: '🎬', name: 'sc_star_movie',    prompt: 'A 16-bit retro pixel art game icon of a black Hollywood movie clapperboard, transparent background' },
  sunny:         { fallback: '☀️', name: 'sc_sunny',         prompt: 'A 16-bit retro pixel art game icon of a bright round yellow sun with rays, transparent background' },
  heatwave:      { fallback: '🔥', name: 'sc_heatwave',      prompt: 'A 16-bit retro pixel art game icon of a thermometer bursting with red heat wave lines, transparent background' },
  rainy:         { fallback: '🌧️', name: 'sc_rainy',         prompt: 'A 16-bit retro pixel art game icon of dark rain clouds dropping blue raindrops, transparent background' },
  warm:          { fallback: '🌤️', name: 'sc_warm',          prompt: 'A 16-bit retro pixel art game icon of a smiling warm sun, transparent background' },
  cloudy:        { fallback: '☁️', name: 'sc_cloudy',        prompt: 'A 16-bit retro pixel art game icon of thick grey overcast storm clouds, transparent background' },
  temperate:     { fallback: '🌸', name: 'sc_temperate',     prompt: 'A 16-bit retro pixel art game icon of a blooming pink cherry blossom flower, transparent background' },
  typhoon:       { fallback: '🌀', name: 'sc_typhoon',       prompt: 'A 16-bit retro pixel art game icon of a swirling cyan storm hurricane typhoon, transparent background' },
  flag_usa:      { fallback: '🇺🇸', name: 'sc_flag_usa',      prompt: 'A 16-bit retro pixel art game icon of the flag of United States of America USA, waving, transparent background' },
  flag_italy:    { fallback: '🇮🇹', name: 'sc_flag_italy',    prompt: 'A 16-bit retro pixel art game icon of the flag of Italy, waving, transparent background' },
  flag_japan:    { fallback: '🇯🇵', name: 'sc_flag_japan',    prompt: 'A 16-bit retro pixel art game icon of the flag of Japan, waving, transparent background' },
  flag_brazil:   { fallback: '🇧🇷', name: 'sc_flag_brazil',   prompt: 'A 16-bit retro pixel art game icon of the flag of Brazil, waving, transparent background' },
  flag_egypt:    { fallback: '🇪🇬', name: 'sc_flag_egypt',    prompt: 'A 16-bit retro pixel art game icon of the flag of Egypt, waving, transparent background' },
  flag_france:   { fallback: '🇫🇷', name: 'sc_flag_france',   prompt: 'A 16-bit retro pixel art game icon of the flag of France, waving, transparent background' },
  flag_australia:{ fallback: '🇦🇺', name: 'sc_flag_australia',prompt: 'A 16-bit retro pixel art game icon of the flag of Australia, waving, transparent background' },
  flag_belgium:  { fallback: '🇧🇪', name: 'sc_flag_belgium',  prompt: 'A 16-bit retro pixel art game icon of the flag of Belgium, waving, transparent background' },
  flag_iceland:  { fallback: '🇮🇸', name: 'sc_flag_iceland',  prompt: 'A 16-bit retro pixel art game icon of the flag of Iceland, waving, transparent background' },
  flag_south_africa: { fallback: '🇿🇦', name: 'sc_flag_south_africa', prompt: 'A 16-bit retro pixel art game icon of the flag of South Africa, waving, transparent background' },
  clock:         { fallback: '⏰', name: 'sc_clock',         prompt: 'A 16-bit retro pixel art game icon of a red ringing twin-bell alarm clock, transparent background' },
  flavor_bubblegum: { fallback: '🍬', name: 'sc_flavor_bubblegum', prompt: 'A 16-bit retro pixel art game icon of a pink bubblegum ice cream scoop, transparent background' },
  flavor_lemon:     { fallback: '🍋', name: 'sc_flavor_lemon',     prompt: 'A 16-bit retro pixel art game icon of a yellow lemon sorbet scoop, transparent background' },
  flavor_mango:     { fallback: '🥭', name: 'sc_flavor_mango',     prompt: 'A 16-bit retro pixel art game icon of an orange mango ice cream scoop, transparent background' },
  flavor_coconut:   { fallback: '🥥', name: 'sc_flavor_coconut',   prompt: 'A 16-bit retro pixel art game icon of a white coconut ice cream scoop, transparent background' },
  flavor_caramel:   { fallback: '🍯', name: 'sc_flavor_caramel',   prompt: 'A 16-bit retro pixel art game icon of a golden caramel ice cream scoop, transparent background' },
  flavor_blueberry: { fallback: '🫐', name: 'sc_flavor_blueberry', prompt: 'A 16-bit retro pixel art game icon of a blue blueberry ice cream scoop, transparent background' },
  flavor_matcha:    { fallback: '🍵', name: 'sc_flavor_matcha',    prompt: 'A 16-bit retro pixel art game icon of a green matcha ice cream scoop, transparent background' },
  flavor_cherry:    { fallback: '🍒', name: 'sc_flavor_cherry',    prompt: 'A 16-bit retro pixel art game icon of a pink cherry ice cream scoop, transparent background' },
  cone_small:       { fallback: '🍦', name: 'sc_cone_small',       prompt: 'A 16-bit retro pixel art game icon of a small simple waffle cone, transparent background' },
  cone_large:       { fallback: '🍧', name: 'sc_cone_large',       prompt: 'A 16-bit retro pixel art game icon of a large waffle cone with waffle grid, transparent background' },
  box_small:        { fallback: '📦', name: 'sc_box_small',        prompt: 'A 16-bit retro pixel art game icon of a small cardboard ice cream box container, transparent background' },
  box_large:        { fallback: '🗳️', name: 'sc_box_large',        prompt: 'A 16-bit retro pixel art game icon of a large cardboard ice cream box container, transparent background' },
  display_case:     { fallback: '🖼️', name: 'sc_display_case',     prompt: 'A 16-bit retro pixel art game icon of a glass display case showing ice cream, transparent background' },
  premium_tub:      { fallback: '📥', name: 'sc_premium_tub',      prompt: 'A 16-bit retro pixel art game icon of a stainless steel premium ice cream tub, transparent background' },
  speed_oven:       { fallback: '🔥', name: 'sc_speed_oven',       prompt: 'A 16-bit retro pixel art game icon of a small retro waffle cone speed oven, transparent background' },
  tip_jar:          { fallback: '🏺', name: 'sc_tip_jar',          prompt: 'A 16-bit retro pixel art game icon of a glass jar filled with coins, transparent background' },

  worker_cleaner:   { fallback: '🧹', name: 'sc_worker_cleaner',   prompt: 'A 16-bit retro pixel art game icon of a cheerful janitor wearing overalls and holding a mop, transparent background' },
  worker_cashier:   { fallback: '💵', name: 'sc_worker_cashier',   prompt: 'A 16-bit retro pixel art game icon of a smiling cashier at a register wearing a green visor hat, transparent background' },
  worker_maker:     { fallback: '🍨', name: 'sc_worker_maker',     prompt: 'A 16-bit retro pixel art game icon of an ice cream maker chef holding a giant scoop and wearing a chef hat, transparent background' },
  worker_manager:   { fallback: '👔', name: 'sc_worker_manager',   prompt: 'A 16-bit retro pixel art game icon of a serious manager in a business suit holding a clipboard, transparent background' },

  event_critic:     { fallback: '🍽️', name: 'sc_event_critic',     prompt: 'A 16-bit retro pixel art game icon of an elegant VIP food critic in a beret holding a wine glass, transparent background' },
  event_inspector:  { fallback: '🔎', name: 'sc_event_inspector',  prompt: 'A 16-bit retro pixel art game icon of a health inspector in a white coat with a magnifying glass, transparent background' },
  event_festival:   { fallback: '🎡', name: 'sc_event_festival',   prompt: 'A 16-bit retro pixel art game icon of a colorful ice cream festival banner with balloons, transparent background' },
  event_rumor:      { fallback: '📢', name: 'sc_event_rumor',      prompt: 'A 16-bit retro pixel art game icon of a red megaphone broadcasting sound waves, transparent background' },

  level_up:         { fallback: '⬆️', name: 'sc_level_up',         prompt: 'A 16-bit retro pixel art game icon of a bold green upward arrow surrounded by golden sparkles, transparent background' },
  double_scoop:     { fallback: '🍨', name: 'sc_double_scoop',     prompt: 'A 16-bit retro pixel art game icon of two colorful stacked ice cream scoops on a cone, transparent background' },
  strike:           { fallback: '✊', name: 'sc_strike',           prompt: 'A 16-bit retro pixel art game icon of a protest sign held up with STRIKE written on it, transparent background' },
  prestige_token:   { fallback: '🪙', name: 'sc_prestige_token',   prompt: 'A 16-bit retro pixel art game icon of a rare gleaming purple prestige coin with a star, transparent background' },
  exp_orb:          { fallback: '🔮', name: 'sc_exp_orb',          prompt: 'A 16-bit retro pixel art game icon of a glowing blue experience orb sphere, transparent background' },
  rebirth_star:     { fallback: '💫', name: 'sc_rebirth_star',     prompt: 'A 16-bit retro pixel art game icon of a golden shooting star with a trail, transparent background' },
  salary:           { fallback: '💳', name: 'sc_salary',           prompt: 'A 16-bit retro pixel art game icon of a stack of coins next to a banknote, transparent background' },
  bar_chart:        { fallback: '📊', name: 'sc_bar_chart',        prompt: 'A 16-bit retro pixel art game icon of a green ascending bar chart with an arrow, transparent background' },
  snowflake:        { fallback: '❄️', name: 'sc_snowflake',        prompt: 'A 16-bit retro pixel art game icon of a crisp white crystalline snowflake, transparent background' },
  hourglass:        { fallback: '⌛', name: 'sc_hourglass',        prompt: 'A 16-bit retro pixel art game icon of a golden hourglass with falling sand, transparent background' },
  notification:     { fallback: '🔔', name: 'sc_notification',     prompt: 'A 16-bit retro pixel art game icon of a yellow notification bell with a red dot, transparent background' },

  admin_badge:      { fallback: '🛡️', name: 'sc_admin_badge',      prompt: 'A 16-bit retro pixel art game icon of a gold police admin shield badge, transparent background' },
  ban_hammer:       { fallback: '🔨', name: 'sc_ban_hammer',       prompt: 'A 16-bit retro pixel art game icon of a large wooden judge ban hammer, transparent background' },

  arrow_right:      { fallback: '▶️', name: 'sc_arrow_right',      prompt: 'A 16-bit retro pixel art game icon of a bold right-pointing navigation arrow, transparent background' },
  arrow_up:         { fallback: '⬆️', name: 'sc_arrow_up',         prompt: 'A 16-bit retro pixel art game icon of a bold upward navigation arrow, transparent background' },
  page_prev:        { fallback: '◀️', name: 'sc_page_prev',        prompt: 'A 16-bit retro pixel art game icon of a previous page left chevron button, transparent background' },
  page_next:        { fallback: '▶️', name: 'sc_page_next',        prompt: 'A 16-bit retro pixel art game icon of a next page right chevron button, transparent background' },
  eye:              { fallback: '👁️', name: 'sc_eye',              prompt: 'A 16-bit retro pixel art game icon of a single open eye with blue iris, transparent background' },

  flag_mexico:      { fallback: '🇲🇽', name: 'sc_flag_mexico',      prompt: 'A 16-bit retro pixel art game icon of the flag of Mexico, waving, transparent background' },
  flag_india:       { fallback: '🇮🇳', name: 'sc_flag_india',       prompt: 'A 16-bit retro pixel art game icon of the flag of India, waving, transparent background' },
  flag_germany:     { fallback: '🇩🇪', name: 'sc_flag_germany',     prompt: 'A 16-bit retro pixel art game icon of the flag of Germany, waving, transparent background' },
  flag_spain:       { fallback: '🇪🇸', name: 'sc_flag_spain',       prompt: 'A 16-bit retro pixel art game icon of the flag of Spain, waving, transparent background' },
  flag_canada:      { fallback: '🇨🇦', name: 'sc_flag_canada',      prompt: 'A 16-bit retro pixel art game icon of the flag of Canada, waving, transparent background' },

  flavor_vanilla:   { fallback: '🍦', name: 'sc_flavor_vanilla',   prompt: 'A 16-bit retro pixel art game icon of a white vanilla bean ice cream scoop, transparent background' },
  flavor_raspberry: { fallback: '🍒', name: 'sc_flavor_raspberry', prompt: 'A 16-bit retro pixel art game icon of a deep red raspberry ice cream scoop, transparent background' },
  flavor_taro:      { fallback: '💜', name: 'sc_flavor_taro',      prompt: 'A 16-bit retro pixel art game icon of a purple taro ice cream scoop, transparent background' },
  flavor_banana:    { fallback: '🍌', name: 'sc_flavor_banana',    prompt: 'A 16-bit retro pixel art game icon of a yellow banana ice cream scoop, transparent background' },
};


export const EMOJI_IDS: Record<string, string> = {
  "cross_red": "1517198137947586701",
  "cash": "1517198292969324765",
  "broom": "1517198383448850433",
  "check_green": "1517198606149615716",
  "dot_green": "1517198784503873638",
  "gear": "1517198946672443604",
  "star": "1517199294552084571",
  "warning": "1517199449913294889",
  "wallet": "1517199605194821814",
  "tie": "1517199771327004744",
  "scoop": "1517200012252024936",
  "box": "1517200236672716972",
  "globe": "1517200328603209832",
  "stop": "1517200508673327110",
  "lock": "1517200776123125770",
  "store": "1517200992091770961",
  "dot_red": "1517201242097451058",
  "workers": "1517201750065414224",
  "gem": "1517201938314428456",
  "arrow_back": "1517202084687253635",
  "cone": "1517202233286987976",
  "money_bag": "1517202371543957585",
  "gift": "1517202521431736400",
  "pencil": "1517202674905387169",
  "refresh": "1517202812608581763",
  "door": "1517202936030035978",
  "cloudy_sun": "1517203107577204847",
  "sparkles": "1517203219661717787",
  "trophy": "1517203363115044904",
  "medal_gold": "1517203486125592709",
  "medal_silver": "1517203612055371826",
  "medal_bronze": "1517203772135309547",
  "clipboard": "1517203954339942490",
  "popper": "1517204163547627539",
  "chocolate": "1517204376903487508",
  "strawberry": "1517204561394274405",
  "mint": "1517204777522430104",
  "pistachio": "1517204947546931430",
  "cup": "1517205115772207258",
  "freezer": "1517205265781493830",
  "rack": "1517208291430633522",
  "neon_sign": "1517205524725104844",
  "counter": "1517205670670241804",
  "critic": "1517206166474592468",
  "star_movie": "1517206409735966720",
  "sunny": "1517206609183641693",
  "heatwave": "1517206804021383208",
  "rainy": "1517206912498667622",
  "warm": "1517207147551653970",
  "cloudy": "1517207352963633152",
  "temperate": "1517207494563332107",
  "typhoon": "1517207801422942298",
  "flag_usa": "1517209619339022346",
  "flag_italy": "1517209825329549493",
  "flag_japan": "1517210080276254791",
  "flag_brazil": "1517210272354533526",
  "flag_egypt": "1517210413710704850",
  "flag_france": "1517210551271293072",
  "flag_australia": "1517210751834525726",
  "flag_belgium": "1517210940339130564",
  "flag_iceland": "1517211045012181244",
  "flag_south_africa": "1517211153426813060",
  "clock": "1517211254597488832",
  "flavor_bubblegum": "1517541942710370304",
  "flavor_lemon": "1517542515329208362",
  "flavor_mango": "1517543121070588045",
  "flavor_coconut": "1517543416425349140",
  "flavor_caramel": "1517543799595860180",
  "flavor_blueberry": "1517544732199223427",
  "flavor_matcha": "1517545674634432542",
  "flavor_cherry": "1517546279863980132",
  "cone_small": "1517546741216579804",
  "cone_large": "1517546909114437703",
  "box_small": "1517546994061807676",
  "box_large": "1517547255517937665",
  "display_case": "1517547543440130221",
  "premium_tub": "1517547801444356227",
  "speed_oven": "1517548035117158461",
  "tip_jar": "1517548199769014376",
  "worker_cleaner": "1517602555927072971",
  "worker_cashier": "1517602680350965812",
  "worker_maker": "1517602817160773743",
  "worker_manager": "1517602959096152225",
  "event_critic": "1517603175673233650",
  "event_inspector": "1517603313904783370",
  "event_festival": "1517603445601861683",
  "event_rumor": "1517603592998092890",
  "level_up": "1517603711843569704",
  "double_scoop": "1517603831305998522",
  "strike": "1517603949463474256",
  "prestige_token": "1517604050575560916",
  "exp_orb": "1517604135816663201",
  "rebirth_star": "1517604273012342814",
  "salary": "1517604439936991283",
  "bar_chart": "1517604568035360889",
  "snowflake": "1517604736235339957",
  "hourglass": "1517604913600004280",
  "notification": "1517605089735475473",
  "admin_badge": "1517605260812750888",
  "ban_hammer": "1517605401997217973",
  "arrow_right": "1517605566262808787",
  "arrow_up": "1517605678879867101",
  "page_prev": "1517605816650174548",
  "page_next": "1517605953380290581",
  "eye": "1517606109353869425",
  "flag_mexico": "1517606249301151795",
  "flag_india": "1517606339495592036",
  "flag_germany": "1517606454859661572",
  "flag_spain": "1517606603002740956",
  "flag_canada": "1517606772016152649",
  "flavor_vanilla": "1517606950790107246",
  "flavor_raspberry": "1517607110953795656",
  "flavor_taro": "1517607922551754953",
  "flavor_banana": "1517608049865658641"
};

export function e(key: keyof typeof EMOJI_DEFINITIONS): string {
  const id = EMOJI_IDS[key];
  const entry = EMOJI_DEFINITIONS[key];
  if (!id || !entry) {
    return entry ? entry.fallback : '•';
  }
  return `<:${entry.name}:${id}>`;
}

export function getItemEmoji(name: string): string {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('vanilla')) return e('flavor_vanilla');
  if (lowercase.includes('chocolate')) return e('chocolate');
  if (lowercase.includes('strawberry')) return e('strawberry');
  if (lowercase.includes('mint')) return e('mint');
  if (lowercase.includes('pistachio')) return e('pistachio');
  if (lowercase.includes('bubblegum')) return e('flavor_bubblegum');
  if (lowercase.includes('lemon')) return e('flavor_lemon');
  if (lowercase.includes('mango')) return e('flavor_mango');
  if (lowercase.includes('coconut')) return e('flavor_coconut');
  if (lowercase.includes('caramel')) return e('flavor_caramel');
  if (lowercase.includes('blueberry')) return e('flavor_blueberry');
  if (lowercase.includes('matcha')) return e('flavor_matcha');
  if (lowercase.includes('cherry')) return e('flavor_cherry');
  if (lowercase.includes('raspberry')) return e('flavor_raspberry');
  if (lowercase.includes('taro')) return e('flavor_taro');
  if (lowercase.includes('banana')) return e('flavor_banana');
  if (lowercase.includes('small cone')) return e('cone_small');
  if (lowercase.includes('large cone')) return e('cone_large');
  if (lowercase.includes('small box')) return e('box_small');
  if (lowercase.includes('large box')) return e('box_large');
  if (lowercase.includes('cone')) return e('cone');
  if (lowercase.includes('cup')) return e('cup');
  if (lowercase.includes('freezer')) return e('freezer');
  if (lowercase.includes('rack')) return e('rack');
  if (lowercase.includes('neon')) return e('neon_sign');
  if (lowercase.includes('counter')) return e('counter');
  if (lowercase.includes('display case')) return e('display_case');
  if (lowercase.includes('premium tub')) return e('premium_tub');
  if (lowercase.includes('speed oven')) return e('speed_oven');
  if (lowercase.includes('tip jar')) return e('tip_jar');
  if (lowercase.includes('cyberpunk')) return e('neon_sign');
  if (lowercase.includes('retro arcade')) return e('star_movie');
  if (lowercase.includes('luxury gold')) return e('trophy');
  return e('box');
}

export function getWorkerEmoji(type: string): string {
  switch (type) {
    case 'cleaner': return e('worker_cleaner');
    case 'cashier': return e('worker_cashier');
    case 'maker':   return e('worker_maker');
    case 'manager': return e('worker_manager');
    default:        return e('workers');
  }
}

